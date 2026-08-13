const FEISHU_ORIGIN = 'https://open.feishu.cn'
const DEFAULT_BASE_TOKEN = 'ZaWNbPjyoambOdsCSmtcfpQtnbf'
const DEFAULT_TABLE_ID = 'tblp1P1xwCySxO5H'
const MAX_BODY_BYTES = 48 * 1024
const MAX_ATTACHMENT_REQUESTS = 40
const REVIEW_RESULTS = new Set(['通过', '不通过'])
const ACTIVE_REVIEW_RESULTS = new Set(['', '待审核', '通过', '不通过'])

const ATTACHMENT_FIELDS = new Set([
  '公开账号主页截屏',
  '上传你的工作台照片',
  '上传或展示你的过往作品',
])

const SUMMARY_FIELDS = [
  '编号',
  '提交时间',
  '抖音昵称',
  '微信昵称',
  '联系电话【微信联系】',
  '所在城市',
  '你的身份是？',
  '直播审核结果',
]

let tenantTokenCache = null

function sendJson(response, status, data) {
  response.statusCode = status
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

function safeEqual(left, right) {
  const a = String(left || '')
  const b = String(right || '')
  let mismatch = a.length === b.length ? 0 : 1
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    mismatch |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0)
  }
  return mismatch === 0
}

function validateAccessKey(body, defaults) {
  if (!defaults.requireAccessKey) return
  const expected = String(defaults.accessKey || '')
  if (expected.length < 12) {
    const error = new Error('Vercel 尚未配置安全的匠人审核访问口令')
    error.status = 500
    throw error
  }
  if (!safeEqual(expected, body.accessKey)) {
    const error = new Error('审核访问口令不正确')
    error.status = 401
    throw error
  }
}

function validateCredentials(body, defaults) {
  const appId = String(body.appId || defaults.appId || '').trim()
  const appSecret = String(body.appSecret || defaults.appSecret || '').trim()
  if (!/^cli_[a-z0-9]+$/i.test(appId)) throw new Error('App ID 格式不正确，应以 cli_ 开头')
  if (appSecret.length < 8 || appSecret.length > 256) throw new Error('请填写正确的 App Secret')
  return { appId, appSecret }
}

function normalizeValue(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(normalizeValue).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return normalizeValue(
      value.full_address
      ?? value.name
      ?? value.text
      ?? value.value
      ?? value.address
      ?? '',
    )
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
    message = '机器人缺少飞书权限，请开通多维表格和云文档附件读取权限'
  } else if (fallbackStatus === 403 || /forbidden/i.test(rawMessage)) {
    message = '飞书拒绝访问，请把应用添加为“鲲鹏匠人”多维表格的协作者并授予可编辑权限'
  } else if (code === 1254043 || /not found/i.test(rawMessage)) {
    message = '机器人无法访问“鲲鹏匠人”问卷表，请检查协作者权限'
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
    const error = new Error('无法连接飞书开放平台，请稍后重试')
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
  ) return tenantTokenCache.token

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

function baseConfig(defaults) {
  const baseToken = String(defaults.baseToken || DEFAULT_BASE_TOKEN).trim()
  const tableId = String(defaults.tableId || DEFAULT_TABLE_ID).trim()
  if (!baseToken || !/^tbl[a-z0-9]+$/i.test(tableId)) throw new Error('匠人问卷数据源配置不正确')
  return { baseToken, tableId }
}

function summary(record) {
  const fields = record.fields || {}
  return {
    record_id: record.record_id,
    created_time: record.created_time,
    fields: Object.fromEntries(SUMMARY_FIELDS.map((name) => [name, fields[name] ?? ''])),
  }
}

function activeStatus(record) {
  return normalizeValue(record?.fields?.['直播审核结果'])
}

function isActiveRecord(record) {
  return ACTIVE_REVIEW_RESULTS.has(activeStatus(record))
}

function recordNumber(record) {
  const number = Number(normalizeValue(record?.fields?.['编号']))
  return Number.isFinite(number) ? number : Number.MAX_SAFE_INTEGER
}

async function listRecords(token, config, fieldNames = SUMMARY_FIELDS) {
  const records = []
  let pageToken = ''
  let pages = 0
  do {
    const params = new URLSearchParams({
      page_size: '500',
      field_names: JSON.stringify(fieldNames),
    })
    if (pageToken) params.set('page_token', pageToken)
    const payload = await feishuJson(
      `/open-apis/bitable/v1/apps/${config.baseToken}/tables/${config.tableId}/records?${params}`,
      { token },
    )
    records.push(...(payload.data?.items || []))
    pageToken = payload.data?.has_more ? payload.data?.page_token || '' : ''
    pages += 1
  } while (pageToken && pages < 30)
  return records
}

async function getRecord(token, config, recordId) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${config.baseToken}/tables/${config.tableId}/records/${recordId}`,
    { token },
  )
  return payload.data?.record
}

function searchScore(record, query) {
  const fields = record.fields || {}
  const values = [
    fields['编号'],
    fields['联系电话【微信联系】'],
    fields['微信昵称'],
    fields['抖音昵称'],
    fields['你的公开账号'],
  ].map(normalizeSearch)
  if (values.some((value) => value === query)) return 3
  if (values.some((value) => value.startsWith(query))) return 2
  if (values.some((value) => value.includes(query))) return 1
  return 0
}

async function searchRecords(token, config, rawQuery) {
  const query = normalizeSearch(rawQuery)
  if (!query || query.length > 100) throw new Error('请输入 1–100 个字符进行搜索')
  const records = await listRecords(token, config, [...SUMMARY_FIELDS, '你的公开账号'])
  return records
    .filter(isActiveRecord)
    .map((record) => ({ record, score: searchScore(record, query) }))
    .filter((item) => item.score)
    .sort((a, b) => b.score - a.score || recordNumber(b.record) - recordNumber(a.record))
    .slice(0, 20)
    .map((item) => summary(item.record))
}

async function queueData(token, config, rawAfterNumber = '') {
  const afterNumber = Number(normalizeValue(rawAfterNumber))
  const records = (await listRecords(token, config))
    .filter(isActiveRecord)
    .sort((a, b) => recordNumber(a) - recordNumber(b))
  const pending = records.filter((record) => ['', '待审核'].includes(activeStatus(record)))
  const next = pending.find((record) => !Number.isFinite(afterNumber) || recordNumber(record) > afterNumber)
    || pending[0]
    || null
  return {
    record: next ? summary(next) : null,
    stats: {
      total: records.length,
      pending: pending.length,
      passed: records.filter((record) => activeStatus(record) === '通过').length,
      rejected: records.filter((record) => activeStatus(record) === '不通过').length,
    },
  }
}

async function updateReview(token, config, recordId, rawResult) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const result = String(rawResult || '').trim()
  if (!REVIEW_RESULTS.has(result)) throw new Error('审核结果只能是“通过”或“不通过”')
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${config.baseToken}/tables/${config.tableId}/records/${recordId}`,
    {
      token,
      method: 'PUT',
      body: { fields: { 直播审核结果: result } },
    },
  )
  return { record_id: recordId, result, record: payload.data?.record }
}

function validateMediaRequestUrl(rawUrl, fileToken) {
  if (!rawUrl) return ''
  try {
    const url = new URL(String(rawUrl))
    if (url.origin !== FEISHU_ORIGIN) return ''
    if (url.pathname !== '/open-apis/drive/v1/medias/batch_get_tmp_download_url') return ''
    const tokens = url.searchParams.getAll('file_tokens')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
    return tokens.includes(fileToken) ? url.toString() : ''
  } catch {
    return ''
  }
}

function findDirectUrl(value, fileToken, allowUnscoped = false) {
  if (!value || typeof value !== 'object') return ''
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findDirectUrl(item, fileToken, allowUnscoped)
      if (found) return found
    }
    return ''
  }
  const token = String(value.file_token || value.fileToken || value.token || '')
  const candidate = value.tmp_download_url || value.tmpDownloadUrl || value.download_url || ''
  if (candidate && (allowUnscoped || token === fileToken)) {
    try {
      const url = new URL(String(candidate))
      if (url.protocol === 'https:') return url.toString()
    } catch {
      // Keep looking through the payload.
    }
  }
  for (const child of Object.values(value)) {
    const found = findDirectUrl(child, fileToken, allowUnscoped)
    if (found) return found
  }
  return ''
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

async function requestDirectUrl(token, requestUrl, fileToken) {
  const response = await remoteFetch(requestUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.code) {
    throw friendlyFeishuError(payload, response.ok ? 400 : response.status || 502)
  }
  return findDirectUrl(payload, fileToken) || findDirectUrl(payload, fileToken, true)
}

async function attachmentDirectUrl(token, config, recordId, request, metadata) {
  const fieldName = String(request.fieldName || '')
  const fileToken = String(request.fileToken || '')
  if (!ATTACHMENT_FIELDS.has(fieldName)) throw new Error('不支持读取该附件字段')
  if (!fileToken || fileToken.length > 256) throw new Error('附件标识不正确')

  const supplied = validateMediaRequestUrl(request.tmpUrl, fileToken)
  if (supplied) {
    const url = await requestDirectUrl(token, supplied, fileToken)
    if (url) return url
  }

  const metadataUrl = findDirectUrl(metadata, fileToken)
  if (metadataUrl) return metadataUrl
  const extra = findAttachmentExtra(metadata, fileToken)
  const params = new URLSearchParams({ file_tokens: fileToken })
  if (extra) params.set('extra', extra)
  const fallback = `${FEISHU_ORIGIN}/open-apis/drive/v1/medias/batch_get_tmp_download_url?${params}`
  const url = await requestDirectUrl(token, fallback, fileToken)
  if (!url) throw new Error('飞书没有返回可用的图片直链')
  return url
}

async function attachmentDirectUrls(token, config, recordId, rawAttachments) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const attachments = Array.isArray(rawAttachments) ? rawAttachments.slice(0, MAX_ATTACHMENT_REQUESTS) : []
  const metadata = attachments.length
    ? await feishuJson(
      `/open-apis/base/v3/bases/${config.baseToken}/tables/${config.tableId}/get_attachments`,
      { token, method: 'POST', body: { record_id_list: [recordId] } },
    )
    : {}
  const results = await Promise.all(attachments.map(async (attachment) => {
    try {
      const url = await attachmentDirectUrl(token, config, recordId, attachment, metadata)
      return {
        fieldName: String(attachment.fieldName || ''),
        fileToken: String(attachment.fileToken || ''),
        filename: String(attachment.filename || '飞书图片'),
        url,
      }
    } catch (error) {
      return {
        fieldName: String(attachment.fieldName || ''),
        fileToken: String(attachment.fileToken || ''),
        filename: String(attachment.filename || '飞书图片'),
        error: error?.message || '图片直链获取失败',
      }
    }
  }))
  return results
}

export async function handleArtisanApi(request, response, defaults = {}) {
  try {
    if (request.method !== 'POST') {
      sendJson(response, 405, { message: '只支持 POST 请求' })
      return
    }
    const body = await readJson(request)
    validateAccessKey(body, defaults)
    const credentials = validateCredentials(body, defaults)
    const config = baseConfig(defaults)
    const token = await getTenantToken(credentials.appId, credentials.appSecret)
    const pathname = new URL(request.url || '/', 'http://localhost').pathname

    if (pathname === '/api/artisan/search') {
      sendJson(response, 200, { records: await searchRecords(token, config, body.query) })
      return
    }
    if (pathname === '/api/artisan/next') {
      sendJson(response, 200, await queueData(token, config, body.afterNumber))
      return
    }
    if (pathname === '/api/artisan/record') {
      sendJson(response, 200, {
        record: await getRecord(token, config, String(body.recordId || '')),
      })
      return
    }
    if (pathname === '/api/artisan/review') {
      sendJson(response, 200, await updateReview(
        token,
        config,
        String(body.recordId || ''),
        body.result,
      ))
      return
    }
    if (pathname === '/api/artisan/attachment-urls') {
      sendJson(response, 200, {
        images: await attachmentDirectUrls(
          token,
          config,
          String(body.recordId || ''),
          body.attachments,
        ),
      })
      return
    }
    sendJson(response, 404, { message: '接口不存在' })
  } catch (error) {
    sendJson(response, error.status || 400, {
      message: error?.message || '飞书匠人审核服务处理失败',
      ...(error?.code ? { code: error.code } : {}),
    })
  }
}

function installMiddleware(server) {
  server.middlewares.use((request, response, next) => {
    if (request.method !== 'POST' || !request.url?.startsWith('/api/artisan/')) {
      next()
      return
    }
    handleArtisanApi(request, response)
  })
}

export default function feishuArtisanApi() {
  return {
    name: 'feishu-artisan-local-api',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  }
}
