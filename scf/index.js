'use strict';
const https = require('https');
const http = require('http');

const FEISHU_APP_ID = 'cli_aada2fcf43f81bdd';
const BITABLE_APP_TOKEN = 'FpVaw2AkAitTwjkXVFaclw2wnMd';
const BITABLE_TABLE_ID = 'tblSIYJ2tkemtXeE';
const RATE_LIMIT_SECONDS = 300;
const MAX_BODY_SIZE = 4096;

// 简单的内存频率限制（重启后清空）
const rateLimitMap = new Map();

function fetchJSON(url, options) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const mod = urlObj.protocol === 'https:' ? https : http;
    const req = mod.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function getTenantToken(appSecret) {
  const data = await fetchJSON('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: FEISHU_APP_ID, app_secret: appSecret }),
  });
  return data.tenant_access_token || null;
}

async function writeToBitable(token, fields) {
  return await fetchJSON(
    `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ fields }),
    }
  );
}

exports.main_handler = async (event, context) => {
  const { requestMethod, headers, body, queryString } = event;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // CORS 预检
  if (requestMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (requestMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ msg: 'Method not allowed' }) };
  }

  // 获取客户端 IP
  const ip = (headers && (headers['x-forwarded-for'] || headers['client-ip'])) || 'unknown';

  // 频率限制
  const lastSubmit = rateLimitMap.get(ip);
  if (lastSubmit) {
    const elapsed = (Date.now() - lastSubmit) / 1000;
    if (elapsed < RATE_LIMIT_SECONDS) {
      const waitSeconds = Math.ceil(RATE_LIMIT_SECONDS - elapsed);
      return {
        statusCode: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 429, msg: `提交太频繁，请${waitSeconds}秒后再试` }),
      };
    }
  }

  // 读取请求体
  const rawBody = body || '';
  if (rawBody.length > MAX_BODY_SIZE) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 400, msg: '请求数据过大' }),
    };
  }

  let parsed;
  try { parsed = JSON.parse(rawBody); }
  catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 400, msg: '数据格式错误' }),
    };
  }

  if (!parsed.msg_type || !parsed.card) {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 400, msg: '数据结构不合法' }),
    };
  }

  const webhookUrl = process.env.FEISHU_WEBHOOK;
  const appSecret = process.env.FEISHU_APP_SECRET;

  // 并行执行：转发卡片 + 写入表格
  const results = await Promise.all([
    fetchJSON(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody,
    }).catch(e => ({ code: -1, msg: e.message })),
    (async () => {
      try {
        if (!appSecret) return { code: -1, msg: '未配置APP_SECRET' };
        const token = await getTenantToken(appSecret);
        if (!token) return { code: -1, msg: '获取token失败' };
        if (!parsed._bitableFields) return { code: -1, msg: '无表格数据' };
        return await writeToBitable(token, parsed._bitableFields);
      } catch (e) { return { code: -1, msg: e.message }; }
    })(),
  ]);

  const feishuResult = results[0];

  // 成功后记录频率
  if (feishuResult.code === 0 || feishuResult.StatusCode === 0) {
    rateLimitMap.set(ip, Date.now());
    // 清理过期记录
    if (rateLimitMap.size > 10000) {
      for (const [key, val] of rateLimitMap) {
        if (Date.now() - val > RATE_LIMIT_SECONDS * 1000) rateLimitMap.delete(key);
      }
    }
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: feishuResult.code === 0 ? 0 : feishuResult.code,
      msg: feishuResult.code === 0 ? '提交成功' : '提交失败',
    }),
  };
};
