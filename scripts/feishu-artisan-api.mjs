const FEISHU_ORIGIN = 'https://open.feishu.cn'
const DEFAULT_BASE_TOKEN = 'ZaWNbPjyoambOdsCSmtcfpQtnbf'
const DEFAULT_TABLE_ID = 'tblp1P1xwCySxO5H'
const MAX_BODY_BYTES = 48 * 1024
const MAX_ATTACHMENT_REQUESTS = 40
const MAX_MEDIA_BATCH_SIZE = 5
const MEDIA_REQUEST_INTERVAL_MS = 240
const FEISHU_READ_TIMEOUT_MS = 10 * 1000
const DIRECT_URL_CACHE_TTL_MS = 20 * 60 * 60 * 1000
const INDEX_CACHE_TTL_MS = 30 * 1000
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
  '直播审核备注',
]

let tenantTokenCache = null
let recordIndexCache = null
let recordIndexPromise = null
let recordIndexVersion = 0
let mediaRequestQueue = Promise.resolve()
let nextMediaRequestAt = 0
const directUrlCache = new Map()

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
  if (code === 99991400 || fallbackStatus === 429 || /frequency limit|too many requests/i.test(rawMessage)) {
    message = '飞书附件服务请求频繁，请稍后重试'
  } else if (code === 99991672 || /scope|permission/i.test(rawMessage)) {
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

async function remoteFetch(url, options = {}, { timeoutMs = FEISHU_READ_TIMEOUT_MS, retries = 0 } = {}) {
  let lastError = null
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(url, { ...options, signal: controller.signal })
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 180 * (attempt + 1)))
        continue
      }
    } finally {
      clearTimeout(timer)
    }
  }
  if (lastError?.name === 'AbortError') {
    const error = new Error('飞书读取超时，请稍后重试')
    error.status = 504
    throw error
  }
  try {
    throw lastError
  } catch {
    const error = new Error('无法连接飞书开放平台，请稍后重试')
    error.status = 502
    throw error
  }
}

async function feishuJson(path, { token, method = 'GET', body, retries } = {}) {
  const response = await remoteFetch(`${FEISHU_ORIGIN}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  }, { retries: retries ?? (method === 'GET' ? 1 : 0) })
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
    retries: 1,
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

async function cachedIndexRecords(token, config) {
  const key = `${config.baseToken}:${config.tableId}`
  if (recordIndexCache?.key === key && recordIndexCache.expiresAt > Date.now()) {
    return recordIndexCache.records
  }
  if (recordIndexPromise?.key === key) return recordIndexPromise.promise

  const version = recordIndexVersion
  const promise = listRecords(token, config, [...SUMMARY_FIELDS, '你的公开账号'])
    .then((records) => {
      if (version === recordIndexVersion) {
        recordIndexCache = { key, records, expiresAt: Date.now() + INDEX_CACHE_TTL_MS }
      }
      return records
    })
    .finally(() => {
      if (recordIndexPromise?.promise === promise) recordIndexPromise = null
    })
  recordIndexPromise = { key, promise }
  return promise
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
    fields['联系电话【微信联系】'],
    fields['抖音昵称'],
  ].map(normalizeSearch)
  if (values.some((value) => value === query)) return 3
  if (values.some((value) => value.startsWith(query))) return 2
  if (values.some((value) => value.includes(query))) return 1
  return 0
}

async function searchRecords(token, config, rawQuery) {
  const query = normalizeSearch(rawQuery)
  if (!query || query.length > 100) throw new Error('请输入手机号或抖音昵称进行搜索')
  const records = await cachedIndexRecords(token, config)
  return records
    .filter(isActiveRecord)
    .map((record) => ({ record, score: searchScore(record, query) }))
    .filter((item) => item.score)
    .sort((a, b) => b.score - a.score || recordNumber(b.record) - recordNumber(a.record))
    .slice(0, 20)
    .map((item) => summary(item.record))
}

async function queueData(
  token,
  config,
  rawAfterNumber = '',
  rawDirection = 'next',
  includeReviewed = false,
  includeRecord = false,
) {
  const afterNumber = Number(normalizeValue(rawAfterNumber))
  const direction = rawDirection === 'previous' ? 'previous' : 'next'
  const records = (await cachedIndexRecords(token, config))
    .filter(isActiveRecord)
    .sort((a, b) => recordNumber(a) - recordNumber(b))
  const pending = records.filter((record) => ['', '待审核'].includes(activeStatus(record)))
  const candidates = includeReviewed ? records : pending
  const next = direction === 'previous'
    ? [...candidates].reverse().find((record) => !Number.isFinite(afterNumber) || recordNumber(record) < afterNumber)
      || candidates[candidates.length - 1]
    : candidates.find((record) => !Number.isFinite(afterNumber) || recordNumber(record) > afterNumber)
      || candidates[0]
    || null
  const recordSummary = next ? summary(next) : null
  return {
    record: recordSummary,
    fullRecord: recordSummary && includeRecord
      ? await getRecord(token, config, recordSummary.record_id)
      : null,
    stats: {
      total: records.length,
      pending: pending.length,
      passed: records.filter((record) => activeStatus(record) === '通过').length,
      rejected: records.filter((record) => activeStatus(record) === '不通过').length,
    },
  }
}

async function updateReview(token, config, recordId, rawResult, rawNote) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const result = String(rawResult || '').trim()
  if (!REVIEW_RESULTS.has(result)) throw new Error('审核结果只能是“通过”或“不通过”')
  const note = String(rawNote || '').trim()
  if (note.length > 500) throw new Error('直播审核备注不能超过 500 个字符')
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${config.baseToken}/tables/${config.tableId}/records/${recordId}`,
    {
      token,
      method: 'PUT',
      body: { fields: { 直播审核结果: result, 直播审核备注: note } },
    },
  )
  recordIndexVersion += 1
  recordIndexCache = null
  recordIndexPromise = null
  return { record_id: recordId, result, note, record: payload.data?.record }
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

function mediaExtra(rawUrl, fileToken) {
  const validUrl = validateMediaRequestUrl(rawUrl, fileToken)
  if (!validUrl) return ''
  return new URL(validUrl).searchParams.get('extra') || ''
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

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function scheduleMediaRequest(task) {
  const run = mediaRequestQueue.catch(() => {}).then(task)
  mediaRequestQueue = run.catch(() => {})
  return run
}

function isRateLimited(response, payload) {
  return response.status === 429
    || payload?.code === 99991400
    || /frequency limit|too many requests/i.test(payload?.msg || payload?.message || '')
}

function rateLimitDelay(response, attempt) {
  const resetSeconds = Number(response.headers.get('x-ogw-ratelimit-reset'))
  if (Number.isFinite(resetSeconds) && resetSeconds > 0) {
    return resetSeconds * 1000 + 120
  }
  return 420 * (2 ** attempt)
}

async function requestDirectUrls(token, requestUrl, fileTokens) {
  return scheduleMediaRequest(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const requestDelay = Math.max(0, nextMediaRequestAt - Date.now())
      if (requestDelay) await wait(requestDelay)
      nextMediaRequestAt = Date.now() + MEDIA_REQUEST_INTERVAL_MS
      const response = await remoteFetch(requestUrl, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await response.json().catch(() => ({}))
      if (isRateLimited(response, payload) && attempt < 2) {
        const retryDelay = rateLimitDelay(response, attempt)
        if (retryDelay <= 3_000) {
          await wait(retryDelay)
          continue
        }
      }
      if (!response.ok || payload.code) {
        const error = friendlyFeishuError(payload, response.ok ? 400 : response.status || 502)
        error.retryAfter = Number(response.headers.get('x-ogw-ratelimit-reset')) || 0
        throw error
      }

      const urls = new Map()
      for (const fileToken of fileTokens) {
        const url = findDirectUrl(payload, fileToken)
          || (fileTokens.length === 1 ? findDirectUrl(payload, fileToken, true) : '')
        if (url) urls.set(fileToken, url)
      }
      return urls
    }
    return new Map()
  })
}

async function resolveMediaBatch(token, batch, requestUrl) {
  try {
    return {
      urls: await requestDirectUrls(token, requestUrl, batch.map((item) => item.fileToken)),
      error: null,
    }
  } catch (error) {
    return { urls: new Map(), error }
  }
}

function validateAttachmentRequest(request) {
  const fieldName = String(request.fieldName || '')
  const fileToken = String(request.fileToken || '')
  if (!ATTACHMENT_FIELDS.has(fieldName)) throw new Error('不支持读取该附件字段')
  if (!fileToken || fileToken.length > 256) throw new Error('附件标识不正确')
  return { ...request, fieldName, fileToken }
}

function cachedDirectUrl(fileToken) {
  const cached = directUrlCache.get(fileToken)
  if (cached?.expiresAt > Date.now()) return cached.url
  if (cached) directUrlCache.delete(fileToken)
  return ''
}

function cacheDirectUrl(fileToken, url) {
  directUrlCache.set(fileToken, { url, expiresAt: Date.now() + DIRECT_URL_CACHE_TTL_MS })
  while (directUrlCache.size > 300) {
    directUrlCache.delete(directUrlCache.keys().next().value)
  }
}

function chunks(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

function combinedMediaExtra(attachments) {
  const combined = { bitablePerm: { attachments: {} } }
  let hasPermission = false
  for (const attachment of attachments) {
    const rawExtra = mediaExtra(attachment.tmpUrl, attachment.fileToken)
    if (!rawExtra) continue
    try {
      const permission = JSON.parse(rawExtra)?.bitablePerm
      if (!permission) continue
      if (permission.tableId) combined.bitablePerm.tableId = permission.tableId
      if (permission.rev != null) combined.bitablePerm.rev = permission.rev
      for (const [fieldId, records] of Object.entries(permission.attachments || {})) {
        if (!combined.bitablePerm.attachments[fieldId]) combined.bitablePerm.attachments[fieldId] = {}
        for (const [recordId, tokens] of Object.entries(records || {})) {
          const current = combined.bitablePerm.attachments[fieldId][recordId] || []
          combined.bitablePerm.attachments[fieldId][recordId] = [...new Set([
            ...current,
            ...(Array.isArray(tokens) ? tokens : []),
          ])]
          hasPermission = true
        }
      }
    } catch {
      // A batch without merged permission metadata can still work for ordinary Bases.
    }
  }
  return hasPermission ? JSON.stringify(combined) : ''
}

async function attachmentDirectUrls(token, config, recordId, rawAttachments) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const attachments = (Array.isArray(rawAttachments) ? rawAttachments.slice(0, MAX_ATTACHMENT_REQUESTS) : [])
    .map(validateAttachmentRequest)
  const results = new Map()
  const unresolved = []

  for (const attachment of attachments) {
    const cachedUrl = cachedDirectUrl(attachment.fileToken)
    if (cachedUrl) {
      results.set(attachment.fileToken, { url: cachedUrl })
      continue
    }
    unresolved.push(attachment)
  }

  const batches = chunks(unresolved, MAX_MEDIA_BATCH_SIZE)
  const batchResults = await Promise.all(batches.map((batch) => {
    const params = new URLSearchParams()
    for (const attachment of batch) params.append('file_tokens', attachment.fileToken)
    const extra = combinedMediaExtra(batch)
    if (extra) params.set('extra', extra)
    const requestUrl = `${FEISHU_ORIGIN}/open-apis/drive/v1/medias/batch_get_tmp_download_url?${params}`
    return resolveMediaBatch(token, batch, requestUrl)
  }))

  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index]
    const { urls, error } = batchResults[index]
    for (const attachment of batch) {
      if (!error) {
        const url = urls.get(attachment.fileToken)
        if (url) {
          cacheDirectUrl(attachment.fileToken, url)
          results.set(attachment.fileToken, { url })
        } else {
          results.set(attachment.fileToken, { error: '飞书没有返回可用的附件直链' })
        }
      } else {
        results.set(attachment.fileToken, {
          error: error?.message || '附件直链获取失败',
          rateLimited: error?.code === 99991400 || error?.status === 429,
          retryAfter: error?.retryAfter || 0,
        })
      }
    }
  }

  return attachments.map((attachment) => ({
    fieldName: attachment.fieldName,
    fileToken: attachment.fileToken,
    filename: String(attachment.filename || '飞书附件'),
    size: Number(attachment.size) || 0,
    ...(results.get(attachment.fileToken) || { error: '附件直链获取失败' }),
  }))
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
      sendJson(response, 200, await queueData(
        token,
        config,
        body.afterNumber,
        body.direction,
        body.includeReviewed === true,
        body.includeRecord === true,
      ))
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
        body.note,
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
