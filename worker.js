// Cloudflare Worker - 飞书 Webhook 代理 + 多维表格写入 + 频率限制
// 敏感信息通过 wrangler secret 设置，不写入代码：
//   wrangler secret put FEISHU_WEBHOOK
//   wrangler secret put FEISHU_APP_SECRET

const FEISHU_APP_ID = 'cli_aada2fcf43f81bdd'
const BITABLE_APP_TOKEN = 'FpVaw2AkAitTwjkXVFaclw2wnMd'
const BITABLE_TABLE_ID = 'tblSIYJ2tkemtXeE'
const RATE_LIMIT_SECONDS = 300
const MAX_BODY_SIZE = 4096

// 获取飞书 tenant_access_token
async function getTenantToken(env) {
  const cached = await env.RATE_LIMIT.get('feishu_token')
  if (cached) return cached

  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_APP_ID,
      app_secret: env.FEISHU_APP_SECRET,
    }),
  })
  const data = await res.json()
  if (data.tenant_access_token) {
    // 缓存 2 小时
    await env.RATE_LIMIT.put('feishu_token', data.tenant_access_token, { expirationTtl: 7000 })
    return data.tenant_access_token
  }
  return null
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

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown'

    // 频率限制
    const lastSubmit = await env.RATE_LIMIT.get(`rate:${ip}`)
    if (lastSubmit) {
      const elapsed = (Date.now() - parseInt(lastSubmit)) / 1000
      if (elapsed < RATE_LIMIT_SECONDS) {
        const waitSeconds = Math.ceil(RATE_LIMIT_SECONDS - elapsed)
        return new Response(JSON.stringify({
          code: 429,
          msg: `提交太频繁，请${waitSeconds}秒后再试`,
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        })
      }
    }

    // 读取并校验请求体
    const body = await request.text()
    if (body.length > MAX_BODY_SIZE) {
      return new Response(JSON.stringify({ code: 400, msg: '请求数据过大' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    let parsed
    try {
      parsed = JSON.parse(body)
    } catch {
      return new Response(JSON.stringify({ code: 400, msg: '数据格式错误' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    if (!parsed.msg_type || !parsed.card) {
      return new Response(JSON.stringify({ code: 400, msg: '数据结构不合法' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // 并行执行：转发卡片 + 写入表格
    const [feishuResult, bitableResult] = await Promise.all([
      fetch(env.FEISHU_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      }).then(r => r.json()),
      (async () => {
        try {
          const token = await getTenantToken(env)
          if (!token) return { code: -1, msg: '获取token失败' }
          if (!parsed._bitableFields) return { code: -1, msg: '无表格数据' }
          return await writeToBitable(token, parsed._bitableFields)
        } catch (e) { return { code: -1, msg: e.message } }
      })(),
    ])

    // 3. 成功后记录频率
    if (feishuResult.code === 0 || feishuResult.StatusCode === 0) {
      await env.RATE_LIMIT.put(`rate:${ip}`, Date.now().toString(), {
        expirationTtl: 600,
      })
    }

    return new Response(JSON.stringify({
      code: feishuResult.code === 0 ? 0 : feishuResult.code,
      msg: feishuResult.code === 0 ? '提交成功' : '提交失败',
      bitable: bitableResult,
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  },
}
