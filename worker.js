// Cloudflare Worker - 飞书多维表格写入
// 敏感信息通过 wrangler secret 设置：
//   wrangler secret put FEISHU_APP_SECRET

const FEISHU_APP_ID = 'cli_aada2fcf43f81bdd'
const BITABLE_APP_TOKEN = 'FpVaw2AkAitTwjkXVFaclw2wnMd'
const BITABLE_TABLE_ID = 'tblSIYJ2tkemtXeE'

// 获取飞书 tenant_access_token
async function getTenantToken(appSecret) {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: appSecret,
    }),
  })
  const data = await res.json()
  return data.tenant_access_token || null
}

// 写入多维表格
async function writeToBitable(token, fields) {
  const url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${BITABLE_APP_TOKEN}/tables/${BITABLE_TABLE_ID}/records`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ fields }),
  })
  return await res.json()
}

export default {
  async fetch(request, env) {
    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // 读取并校验请求体
    const body = await request.text()
    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      return new Response(JSON.stringify({ code: 400, msg: '数据格式错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 写入多维表格
    try {
      const token = await getTenantToken(env.FEISHU_APP_SECRET)
      if (!token) {
        return new Response(JSON.stringify({ code: -1, msg: '获取token失败' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }
      if (!parsed._bitableFields) {
        return new Response(JSON.stringify({ code: 400, msg: '无表格数据' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }
      const result = await writeToBitable(token, parsed._bitableFields)
      return new Response(JSON.stringify({
        code: result.code === 0 ? 0 : -1,
        msg: result.code === 0 ? '提交成功' : '写入失败',
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    } catch (e) {
      return new Response(JSON.stringify({ code: -1, msg: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }
  },
}
