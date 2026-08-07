const FEISHU_ORIGIN = 'https://open.feishu.cn'
const DEFAULT_BASE_TOKEN = 'BO8PbV4F3aAN0msbHVQcW8Vangd'
const DEFAULT_TABLE_ID = 'tblUhSp8cIYw5wHW'
const MAX_BODY_BYTES = 24 * 1024
const CACHE_TTL_MS = 20 * 1000

const SEARCH_FIELDS = [
  '编号',
  '你的微信手机号',
  '你的学校名称是？',
  '你的抖音昵称',
  '你是属于以下哪一种分类？',
  '提交时间',
  'EDU审核结果',
  'EDU审核时间',
  'EDU审核备注',
]

const ATTACHMENT_FIELDS = new Set([
  '【高中生】需要你的学生证',
  '真实校园证明',
  '【高中生】高考准考证',
])
const REVIEW_RESULTS = new Set(['通过', '待补材料', '不通过'])

let tenantTokenCache = null
let recordIndexCache = null

function sendJson(response, status, data) {
  response.status(status)
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.setHeader('Cache-Control', 'no-store')
  response.end(JSON.stringify(data))
}

async function readJson(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body
  }
  if (typeof request.body === 'string') {
    try {
      return JSON.parse(request.body || '{}')
    } catch {
      throw new Error('请求格式不正确')
    }
  }

  const chunks = []
  let size = 0
  for await (const chunk of request) {
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

function secureEqual(expected, provided) {
  const left = String(expected || '')
  const right = String(provided || '')
  let mismatch = left.length === right.length ? 0 : 1
  const length = Math.max(left.length, right.length)
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0)
  }
  return mismatch === 0
}

function validateConfig(body) {
  const appId = String(process.env.FEISHU_APP_ID || '').trim()
  const appSecret = String(process.env.FEISHU_APP_SECRET || '').trim()
  const accessKey = String(process.env.EDU_SCREENING_ACCESS_KEY || process.env.SCREENING_ACCESS_KEY || '')
  const baseToken = String(process.env.EDU_BASE_TOKEN || DEFAULT_BASE_TOKEN).trim()
  const tableId = String(process.env.EDU_TABLE_ID || DEFAULT_TABLE_ID).trim()

  if (!/^cli_[a-z0-9]+$/i.test(appId) || appSecret.length < 8) {
    const error = new Error('Vercel 尚未配置飞书应用凭据')
    error.status = 500
    throw error
  }
  if (accessKey.length < 8) {
    const error = new Error('Vercel 尚未配置审核访问密码')
    error.status = 500
    throw error
  }
  if (!secureEqual(accessKey, body.accessKey)) {
    const error = new Error('审核密码不正确')
    error.status = 401
    throw error
  }
  if (!baseToken || !/^tbl[a-z0-9]+$/i.test(tableId)) {
    const error = new Error('EDU 飞书表格环境变量不正确')
    error.status = 500
    throw error
  }
  return { appId, appSecret, baseToken, tableId }
}

function normalizeValue(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(normalizeValue).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return normalizeValue(value.full_address ?? value.name ?? value.text ?? value.value ?? value.address ?? '')
  }
  return String(value).trim()
}

function normalizeSearch(value) {
  return normalizeValue(value).toLowerCase().replace(/[\s\-—_（）()【】\[\]：:。,.，#]/g, '')
}

function sanitizeRecord(record) {
  if (!record) return record
  const fields = { ...(record.fields || {}) }
  if (normalizeValue(fields['你的微信手机号'])) fields['你的微信手机号'] = '***'
  delete fields['提交人']
  return { ...record, fields }
}

function recordNumber(record) {
  return Number(normalizeValue(record.fields?.['编号'])) || 0
}

function recordSummary(record) {
  const fields = record.fields || {}
  return {
    record_id: record.record_id,
    number: normalizeValue(fields['编号']) || '—',
    school: normalizeValue(fields['你的学校名称是？']) || '未填写学校',
    category: normalizeValue(fields['你是属于以下哪一种分类？']) || '未分类',
    phone: normalizeValue(fields['你的微信手机号']) ? '***' : '',
    douyin: normalizeValue(fields['你的抖音昵称']),
    submitted_at: normalizeValue(fields['提交时间']),
    review_result: normalizeValue(fields['EDU审核结果']),
    review_time: normalizeValue(fields['EDU审核时间']),
    review_note: normalizeValue(fields['EDU审核备注']),
  }
}

function statsFor(records) {
  const reviewed = records.filter((record) => normalizeValue(record.fields?.['EDU审核结果'])).length
  return { total: records.length, reviewed, pending: Math.max(0, records.length - reviewed) }
}

function friendlyFeishuError(payload, fallbackStatus = 502) {
  const code = payload?.code
  const rawMessage = payload?.msg || payload?.message || '飞书接口请求失败'
  let message = rawMessage
  if (code === 99991672 || /scope|permission/i.test(rawMessage)) {
    message = '飞书应用缺少多维表格读取或编辑权限'
  } else if (fallbackStatus === 403 || /forbidden/i.test(rawMessage)) {
    message = '飞书应用尚未被添加为 EDU 表格协作者'
  } else if (/app.?secret|app.?id|tenant_access_token/i.test(rawMessage)) {
    message = '飞书应用凭据不正确'
  } else if (code === 1254043 || /not found/i.test(rawMessage)) {
    message = '飞书应用无法访问 EDU 表格，请将应用添加为表格协作者'
  }
  const error = new Error(message)
  error.status = fallbackStatus
  error.code = code
  return error
}

async function feishuFetch(path, { token, method = 'GET', body } = {}) {
  let response
  try {
    response = await fetch(`${FEISHU_ORIGIN}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch {
    const error = new Error('无法连接飞书开放平台')
    error.status = 502
    throw error
  }
  return response
}

async function feishuJson(path, options = {}) {
  const response = await feishuFetch(path, options)
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.code) throw friendlyFeishuError(payload, response.status || 400)
  return payload
}

async function getTenantToken(appId, appSecret) {
  if (
    tenantTokenCache
    && tenantTokenCache.appId === appId
    && tenantTokenCache.appSecret === appSecret
    && tenantTokenCache.expiresAt > Date.now()
  ) return tenantTokenCache.token

  const payload = await feishuJson('/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    body: { app_id: appId, app_secret: appSecret },
  })
  if (!payload.tenant_access_token) throw new Error('未能获取飞书访问凭证')
  const expiresIn = Math.max(600, Number(payload.expire) || 7200)
  tenantTokenCache = {
    appId,
    appSecret,
    token: payload.tenant_access_token,
    expiresAt: Date.now() + Math.max(60, expiresIn - 300) * 1000,
  }
  return tenantTokenCache.token
}

async function listIndexRecords(token, baseToken, tableId, force = false) {
  const cacheKey = `${baseToken}:${tableId}`
  if (!force && recordIndexCache?.key === cacheKey && recordIndexCache.expiresAt > Date.now()) {
    return recordIndexCache.records
  }

  const records = []
  let pageToken = ''
  let pageCount = 0
  do {
    const params = new URLSearchParams({
      page_size: '500',
      field_names: JSON.stringify(SEARCH_FIELDS),
    })
    if (pageToken) params.set('page_token', pageToken)
    const payload = await feishuJson(
      `/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records?${params}`,
      { token },
    )
    records.push(...(payload.data?.items || []))
    pageToken = payload.data?.has_more ? payload.data?.page_token || '' : ''
    pageCount += 1
  } while (pageToken && pageCount < 20)

  records.sort((a, b) => recordNumber(a) - recordNumber(b))
  recordIndexCache = { key: cacheKey, records, expiresAt: Date.now() + CACHE_TTL_MS }
  return records
}

async function searchRecords(token, baseToken, tableId, type, rawQuery) {
  const query = normalizeSearch(rawQuery)
  if (type === 'phone' && !/^1[3-9]\d{9}$/.test(query)) throw new Error('请输入正确的 11 位手机号')
  if (type === 'douyin' && (!query || query.length > 50)) throw new Error('请输入 1–50 个字符的抖音昵称')
  if (!['phone', 'douyin'].includes(type)) throw new Error('查询类型不正确')

  const records = await listIndexRecords(token, baseToken, tableId)
  const matches = records.filter((record) => {
    const fields = record.fields || {}
    if (type === 'phone') return normalizeSearch(fields['你的微信手机号']) === query
    return normalizeSearch(fields['你的抖音昵称']).includes(query)
  })
  return { records: matches.slice(0, 30).map(recordSummary), stats: statsFor(records) }
}

async function nextUnreviewed(token, baseToken, tableId, rawAfterNumber) {
  const records = await listIndexRecords(token, baseToken, tableId)
  const pending = records.filter((record) => !normalizeValue(record.fields?.['EDU审核结果']))
  if (!pending.length) return { record: null, stats: statsFor(records) }
  const afterNumber = Number(rawAfterNumber)
  const record = pending.find((item) => recordNumber(item) > afterNumber) || pending[0]
  return { record: recordSummary(record), stats: statsFor(records) }
}

async function getRecord(token, baseToken, tableId, recordId) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records/${recordId}`,
    { token },
  )
  return sanitizeRecord(payload.data?.record)
}

function localDateTime() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`
}

async function saveReview(token, baseToken, tableId, recordId, result, rawNote) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!REVIEW_RESULTS.has(result)) throw new Error('审核结果不正确')
  const note = String(rawNote || '').trim()
  if (note.length > 500) throw new Error('审核备注不能超过 500 个字')
  if (result !== '通过' && !note) throw new Error('请填写待补材料或不通过的原因')

  const reviewTime = localDateTime()
  await feishuJson(
    `/open-apis/bitable/v1/apps/${baseToken}/tables/${tableId}/records/${recordId}`,
    {
      token,
      method: 'PUT',
      body: { fields: { EDU审核结果: result, EDU审核时间: reviewTime, EDU审核备注: note } },
    },
  )
  recordIndexCache = null
  return { record_id: recordId, result, note, review_time: reviewTime }
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

async function downloadAttachment(token, baseToken, tableId, recordId, fieldName, fileToken) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!ATTACHMENT_FIELDS.has(fieldName)) throw new Error('不允许读取这个附件字段')
  if (!/^[a-z0-9_-]{8,256}$/i.test(fileToken)) throw new Error('附件标识不正确')

  const record = await getRecord(token, baseToken, tableId, recordId)
  const attachments = Array.isArray(record?.fields?.[fieldName]) ? record.fields[fieldName] : []
  if (!attachments.some((item) => item?.file_token === fileToken)) throw new Error('附件不属于这条申请记录')

  let response = await feishuFetch(
    `/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`,
    { token },
  )
  if (!response.ok) {
    const metadata = await feishuJson(
      `/open-apis/base/v3/bases/${baseToken}/tables/${tableId}/get_attachments`,
      { token, method: 'POST', body: { record_id_list: [recordId] } },
    )
    const extra = findAttachmentExtra(metadata, fileToken)
    const suffix = extra ? `?${new URLSearchParams({ extra })}` : ''
    response = await feishuFetch(
      `/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download${suffix}`,
      { token },
    )
  }
  if (!response.ok) throw friendlyFeishuError(await response.json().catch(() => ({})), response.status)
  return response
}

export async function handleEduApi(request, response) {
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { message: '仅支持 POST 请求' })
      return
    }
    const body = await readJson(request)
    const config = validateConfig(body)
    const token = await getTenantToken(config.appId, config.appSecret)
    const pathname = new URL(request.url || '/', 'https://example.invalid').pathname

    if (pathname === '/api/edu/search') {
      sendJson(response, 200, await searchRecords(
        token, config.baseToken, config.tableId, String(body.type || ''), body.query,
      ))
      return
    }
    if (pathname === '/api/edu/next') {
      sendJson(response, 200, await nextUnreviewed(
        token, config.baseToken, config.tableId, body.afterNumber,
      ))
      return
    }
    if (pathname === '/api/edu/record') {
      sendJson(response, 200, { record: await getRecord(
        token, config.baseToken, config.tableId, String(body.recordId || ''),
      ) })
      return
    }
    if (pathname === '/api/edu/review') {
      sendJson(response, 200, await saveReview(
        token,
        config.baseToken,
        config.tableId,
        String(body.recordId || ''),
        String(body.result || ''),
        body.note,
      ))
      return
    }
    if (pathname === '/api/edu/attachment') {
      const attachment = await downloadAttachment(
        token,
        config.baseToken,
        config.tableId,
        String(body.recordId || ''),
        String(body.fieldName || ''),
        String(body.fileToken || ''),
      )
      response.statusCode = 200
      response.setHeader('Content-Type', attachment.headers.get('content-type') || 'application/octet-stream')
      response.setHeader('Cache-Control', 'private, max-age=300')
      const bytes = Buffer.from(await attachment.arrayBuffer())
      response.end(bytes)
      return
    }
    sendJson(response, 404, { message: '接口不存在' })
  } catch (error) {
    sendJson(response, error.status || 400, {
      message: error?.message || 'EDU 飞书服务处理失败',
      ...(error?.code ? { code: error.code } : {}),
    })
  }
}
