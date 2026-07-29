const FEISHU_ORIGIN = 'https://open.feishu.cn'
const BASE_TOKEN = 'NBO0b2rrbaS0sws8YTFc4XlOnlf'
const TABLE_ID = 'tblVnUXJQUgpjcMi'
const MAX_BODY_BYTES = 32 * 1024
let tenantTokenCache = null

const SEARCH_FIELDS = [
  '编号',
  '你的微信注册手机号',
  '你的微信号【微信昵称】',
  '你的抖音昵称',
  '你的抖音号id号',
  '手机号重复',
  'MAC重复',
  '初筛状态',
  '直播筛选结果',
  '直播筛选时间',
]

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}')
    } catch {
      throw new Error('请求格式不正确')
    }
  }

  const chunks = []
  let size = 0

  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('请求内容过大')
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new Error('请求格式不正确')
  }
}

function validateCredentials(body, credentialDefaults = {}) {
  const appId = String(body.appId || credentialDefaults.appId || '').trim()
  const appSecret = String(body.appSecret || credentialDefaults.appSecret || '').trim()
  if (!/^cli_[a-z0-9]+$/i.test(appId)) throw new Error('App ID 格式不正确，应以 cli_ 开头')
  if (appSecret.length < 8 || appSecret.length > 256) throw new Error('请填写正确的 App Secret')
  return { appId, appSecret }
}

function validateAccessKey(body, credentialDefaults = {}) {
  if (!credentialDefaults.requireAccessKey) return

  const expected = String(credentialDefaults.accessKey || '')
  if (expected.length < 12) {
    const error = new Error('Vercel 尚未配置安全的 SCREENING_ACCESS_KEY')
    error.status = 500
    throw error
  }

  const provided = String(body.accessKey || '')
  let mismatch = expected.length === provided.length ? 0 : 1
  const compareLength = Math.max(expected.length, provided.length)
  for (let index = 0; index < compareLength; index += 1) {
    mismatch |= (expected.charCodeAt(index) || 0) ^ (provided.charCodeAt(index) || 0)
  }
  if (mismatch !== 0) {
    const error = new Error('审核访问口令不正确')
    error.status = 401
    throw error
  }
}

function normalizeValue(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(normalizeValue).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return normalizeValue(value.text ?? value.name ?? value.value ?? value.link ?? '')
  }
  return String(value).trim()
}

function normalizeSearch(value) {
  return normalizeValue(value).toLowerCase().replace(/[\s\-—_（）()【】[\]：:。,.，]/g, '')
}

function friendlyFeishuError(payload, fallbackStatus = 502) {
  const code = payload?.code
  const rawMessage = payload?.msg || payload?.message || '飞书接口请求失败'
  let message = rawMessage

  if (code === 99991672 || /scope|permission/i.test(rawMessage)) {
    message = '机器人缺少飞书权限，请开通多维表格记录读取/编辑权限，并把应用添加为该多维表格的协作者'
  } else if (fallbackStatus === 403 || /forbidden/i.test(rawMessage)) {
    message = '飞书拒绝访问：请确认应用权限的新版本已发布，并将机器人通过“添加文档应用”加入目标多维表格；若已开启高级权限，还需授予“可管理”权限'
  } else if (/app.?secret|app.?id|tenant_access_token/i.test(rawMessage)) {
    message = 'App ID 或 App Secret 不正确'
  } else if (code === 1254043 || /not found/i.test(rawMessage)) {
    message = '机器人无法访问这张表，请把应用添加为多维表格协作者'
  }

  const error = new Error(message)
  error.status = fallbackStatus
  error.code = code
  return error
}

async function remoteFetch(url, options) {
  try {
    return await fetch(url, options)
  } catch {
    const error = new Error('无法连接飞书开放平台，请检查网络或本机代理设置')
    error.status = 502
    throw error
  }
}

async function feishuJson(path, { token, method = 'GET', body } = {}) {
  const response = await remoteFetch(`${FEISHU_ORIGIN}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.code) {
    throw friendlyFeishuError(payload, response.ok ? 400 : response.status || 502)
  }
  return payload
}

async function getTenantToken(appId, appSecret) {
  if (
    tenantTokenCache
    && tenantTokenCache.appId === appId
    && tenantTokenCache.appSecret === appSecret
    && tenantTokenCache.expiresAt > Date.now()
  ) {
    return tenantTokenCache.token
  }

  const payload = await feishuJson('/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    body: { app_id: appId, app_secret: appSecret },
  })
  if (!payload.tenant_access_token) throw new Error('未能获取机器人访问凭证')

  const expiresIn = Math.max(600, Number(payload.expire) || 7200)
  tenantTokenCache = {
    appId,
    appSecret,
    token: payload.tenant_access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
  }
  return tenantTokenCache.token
}

function recordSummary(record) {
  const fields = record.fields || {}
  return {
    record_id: record.record_id,
    fields: Object.fromEntries(SEARCH_FIELDS.map((field) => [field, fields[field] ?? ''])),
  }
}

function scoreRecord(record, query) {
  const fields = record.fields || {}
  const values = SEARCH_FIELDS.slice(0, 5).map((field) => normalizeSearch(fields[field]))
  const exact = values.some((value) => value === query)
  const starts = values.some((value) => value.startsWith(query))
  const contains = values.some((value) => value.includes(query))
  return exact ? 3 : starts ? 2 : contains ? 1 : 0
}

async function searchRecords(token, rawQuery) {
  const query = normalizeSearch(rawQuery)
  if (!query || query.length > 100) throw new Error('请输入 1–100 个字符进行搜索')

  const matches = []
  let pageToken = ''
  let pageCount = 0

  do {
    const params = new URLSearchParams({
      page_size: '500',
      automatic_fields: 'true',
      field_names: JSON.stringify(SEARCH_FIELDS),
    })
    if (pageToken) params.set('page_token', pageToken)

    const payload = await feishuJson(
      `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records?${params}`,
      { token },
    )
    const items = payload.data?.items || []
    for (const record of items) {
      const score = scoreRecord(record, query)
      if (score) matches.push({ ...recordSummary(record), _score: score })
    }

    pageToken = payload.data?.has_more ? payload.data?.page_token || '' : ''
    pageCount += 1
  } while (pageToken && pageCount < 20)

  return matches
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score
      const aOld = normalizeValue(a.fields['初筛状态']).includes('重复·旧记录')
      const bOld = normalizeValue(b.fields['初筛状态']).includes('重复·旧记录')
      if (aOld !== bOld) return Number(aOld) - Number(bOld)
      return Number(normalizeValue(b.fields['编号'])) - Number(normalizeValue(a.fields['编号']))
    })
    .slice(0, 20)
    .map(({ _score, ...record }) => record)
}

async function nextUnreviewedRecord(token, rawAfterNumber) {
  const afterNumber = Number(normalizeValue(rawAfterNumber))
  let firstCandidate = null
  let pageToken = ''
  let pageCount = 0
  const fields = [
    '编号',
    '你的微信注册手机号',
    '你的微信号【微信昵称】',
    '你的抖音昵称',
    '你的抖音号id号',
    '初筛状态',
    '直播筛选结果',
    '直播筛选时间',
  ]

  do {
    const params = new URLSearchParams({
      page_size: '100',
      filter: 'CurrentValue.[直播筛选结果] =""',
      sort: JSON.stringify(['编号 ASC']),
      field_names: JSON.stringify(fields),
    })
    if (pageToken) params.set('page_token', pageToken)

    const payload = await feishuJson(
      `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records?${params}`,
      { token },
    )

    for (const record of payload.data?.items || []) {
      const status = normalizeValue(record.fields?.['初筛状态'])
      const result = normalizeValue(record.fields?.['直播筛选结果'])
      if (result) continue
      if (/旧记录|未通过|不合格|重复/.test(status)) continue

      if (!firstCandidate) firstCandidate = record
      const number = Number(normalizeValue(record.fields?.['编号']))
      if (!Number.isFinite(afterNumber) || (Number.isFinite(number) && number > afterNumber)) {
        return recordSummary(record)
      }
    }

    pageToken = payload.data?.has_more ? payload.data?.page_token || '' : ''
    pageCount += 1
  } while (pageToken && pageCount < 20)

  return firstCandidate ? recordSummary(firstCandidate) : null
}

async function getRecord(token, recordId) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    { token },
  )
  return payload.data?.record
}

async function updateReview(token, recordId, result, rawNote) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!['通过', '不通过'].includes(result)) throw new Error('审核结果只能是“通过”或“不通过”')
  const note = String(rawNote || '').trim()
  if (note.length > 500) throw new Error('直播筛选备注不能超过 500 个字符')

  const reviewTime = Date.now()
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    {
      token,
      method: 'PUT',
      body: {
        fields: {
          直播筛选结果: result,
          直播筛选时间: reviewTime,
          直播筛选备注: note,
        },
      },
    },
  )

  return {
    record_id: recordId,
    result,
    note,
    review_time: reviewTime,
    record: payload.data?.record,
  }
}

function findAttachmentExtra(value, fileToken) {
  if (!value || typeof value !== 'object') return ''
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findAttachmentExtra(item, fileToken)
      if (found) return found
    }
    return ''
  }

  const token = value.file_token || value.fileToken || value.token
  if (token === fileToken) return value.extra || value.extra_info || value.extraInfo || ''

  for (const child of Object.values(value)) {
    const found = findAttachmentExtra(child, fileToken)
    if (found) return found
  }
  return ''
}

async function downloadAttachment(token, recordId, fieldName, fileToken) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!ATTACHMENT_FIELD_NAMES.has(fieldName)) throw new Error('不支持读取该附件字段')
  if (!fileToken || String(fileToken).length > 256) throw new Error('附件标识不正确')

  let extra = ''
  let response = await remoteFetch(
    `${FEISHU_ORIGIN}/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`,
    { headers: { Authorization: `Bearer ${token}` } },
  )

  if (!response.ok) {
    const metadata = await feishuJson(
      `/open-apis/base/v3/bases/${BASE_TOKEN}/tables/${TABLE_ID}/get_attachments`,
      {
        token,
        method: 'POST',
        body: { record_id_list: [recordId] },
      },
    )
    extra = findAttachmentExtra(metadata, fileToken)
    const params = new URLSearchParams()
    if (extra) params.set('extra', extra)
    const suffix = params.size ? `?${params}` : ''
    response = await remoteFetch(
      `${FEISHU_ORIGIN}/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download${suffix}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw friendlyFeishuError(payload, response.status || 502)
  }

  return response
}

const ATTACHMENT_FIELD_NAMES = new Set([
  '你参加过哪些鲲鹏产品的内测或公测活动？ 2',
  '请提供你发布作品的截图',
  '请提供和鲲鹏团队反馈问题的沟通截图',
  '请提供证明截图',
  '请提供证明截图 2',
  '请提供观看粉丝灯牌截图',
  '请提供观看粉丝灯牌截图 2',
  '请提供张导的店会员等级截图',
])

export async function handleApi(req, res, credentialDefaults = {}) {
  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { message: '只支持 POST 请求' })
      return
    }

    const body = await readJson(req)
    validateAccessKey(body, credentialDefaults)
    const { appId, appSecret } = validateCredentials(body, credentialDefaults)
    const token = await getTenantToken(appId, appSecret)
    const pathname = new URL(req.url || '/', 'http://localhost').pathname

    if (pathname === '/api/feishu/search') {
      const records = await searchRecords(token, body.query)
      sendJson(res, 200, { records })
      return
    }

    if (pathname === '/api/feishu/record') {
      const record = await getRecord(token, String(body.recordId || ''))
      sendJson(res, 200, { record })
      return
    }

    if (pathname === '/api/feishu/next') {
      const record = await nextUnreviewedRecord(token, body.afterNumber)
      sendJson(res, 200, { record })
      return
    }

    if (pathname === '/api/feishu/review') {
      if (body.prepare === true) {
        sendJson(res, 200, { ready: true })
        return
      }

      const data = await updateReview(
        token,
        String(body.recordId || ''),
        String(body.result || '').trim(),
        body.note,
      )
      sendJson(res, 200, data)
      return
    }

    if (pathname === '/api/feishu/attachment') {
      const attachment = await downloadAttachment(
        token,
        String(body.recordId || ''),
        String(body.fieldName || ''),
        String(body.fileToken || ''),
      )
      res.statusCode = 200
      res.setHeader('Content-Type', attachment.headers.get('content-type') || 'application/octet-stream')
      res.setHeader('Cache-Control', 'private, max-age=300')
      res.end(Buffer.from(await attachment.arrayBuffer()))
      return
    }

    sendJson(res, 404, { message: '接口不存在' })
  } catch (error) {
    sendJson(res, error.status || 400, {
      message: error?.message || '本地飞书服务处理失败',
      ...(error?.code ? { code: error.code } : {}),
    })
  }
}

function installMiddleware(server) {
  server.middlewares.use((req, res, next) => {
    if (req.method !== 'POST' || !req.url?.startsWith('/api/feishu/')) {
      next()
      return
    }
    handleApi(req, res)
  })
}

export default function feishuScreeningApi() {
  return {
    name: 'feishu-screening-local-api',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  }
}
