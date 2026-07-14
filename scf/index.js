'use strict';
const https = require('https');
const http = require('http');

const FEISHU_APP_ID = 'cli_aada2fcf43f81bdd';
const BITABLE_APP_TOKEN = 'FpVaw2AkAitTwjkXVFaclw2wnMd';
const BITABLE_TABLE_ID = 'tblSIYJ2tkemtXeE';
const MAX_BODY_SIZE = 4096;

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

function parseEvent(event) {
  if (typeof event === 'string') {
    return { method: 'POST', body: event };
  }
  if (event.body && !event.requestMethod) {
    return { method: 'POST', body: event.body };
  }
  return { method: event.requestMethod, body: event.body || '' };
}

exports.main_handler = async (event, context) => {
  const { method, body } = parseEvent(event);

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (method !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ msg: 'Method not allowed' }) };
  }

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

  const appSecret = process.env.FEISHU_APP_SECRET;

  // 写入多维表格
  let bitableResult = { code: -1, msg: '未执行' };
  try {
    if (!appSecret) {
      bitableResult = { code: -1, msg: '未配置APP_SECRET' };
    } else {
      const token = await getTenantToken(appSecret);
      if (!token) {
        bitableResult = { code: -1, msg: '获取token失败' };
      } else if (!parsed._bitableFields) {
        bitableResult = { code: -1, msg: '无表格数据' };
      } else {
        bitableResult = await writeToBitable(token, parsed._bitableFields);
      }
    }
  } catch (e) {
    bitableResult = { code: -1, msg: e.message };
  }

  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: bitableResult.code === 0 ? 0 : bitableResult.code,
      msg: bitableResult.code === 0 ? '提交成功' : '提交失败',
    }),
  };
};
