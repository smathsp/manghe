const FEISHU_ORIGIN = 'https://open.feishu.cn'
const BASE_TOKEN = 'NBO0b2rrbaS0sws8YTFc4XlOnlf'
const TABLE_ID = 'tblVnUXJQUgpjcMi'

// --- Blind Box Exchange Review ---
const EXCHANGE_BASE_TOKEN = 'NBO0b2rrbaS0sws8YTFc4XlOnlf' // TODO: update once resolved from wiki
const EXCHANGE_TABLE_ID = 'tblVqVj7G7jZclVT'

const EXCHANGE_SEARCH_FIELDS = [
  '昵称',
  '盲盒编号',
  '中奖内容',
  '你的选择',
]

const EXCHANGE_REVIEW_RESULT_FIELD = '直播筛选结果'
const EXCHANGE_REVIEW_TIME_FIELD = '直播筛选时间'
const EXCHANGE_REVIEW_NOTE_FIELD = '直播筛选备注'
const MAX_BODY_BYTES = 32 * 1024
const SEARCH_CACHE_TTL_MS = 30 * 1000
const INITIAL_SCREEN_APPROVED_STATUSES = new Set([
  '待张导审核',
  '技术合格',
  '初筛通过',
  '通过初筛',
])
let tenantTokenCache = null
let searchIndexCache = null
let searchIndexPromise = null

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
  '直播筛选备注',
  '灯牌总和',
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

function isOldDuplicateRecord(record) {
  const fields = record.fields || {}
  return [
    fields['手机号重复'],
    fields['MAC重复'],
    fields['初筛状态'],
  ].some((value) => /重复[·・\s_-]*旧记录|旧记录/.test(normalizeValue(value)))
}

function isInitialScreenApproved(value) {
  return INITIAL_SCREEN_APPROVED_STATUSES.has(normalizeValue(value))
}

function scoreRecord(record, query) {
  const fields = record.fields || {}
  const values = SEARCH_FIELDS.slice(0, 5).map((field) => normalizeSearch(fields[field]))
  const exact = values.some((value) => value === query)
  const starts = values.some((value) => value.startsWith(query))
  const contains = values.some((value) => value.includes(query))
  return exact ? 3 : starts ? 2 : contains ? 1 : 0
}

async function listSearchRecords(token, extraParams = {}) {
  const records = []
  let pageToken = ''
  let pageCount = 0

  do {
    const params = new URLSearchParams({
      page_size: '500',
      field_names: JSON.stringify(SEARCH_FIELDS),
      ...extraParams,
    })
    if (pageToken) params.set('page_token', pageToken)

    const payload = await feishuJson(
      `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records?${params}`,
      { token },
    )
    records.push(...(payload.data?.items || []))

    pageToken = payload.data?.has_more ? payload.data?.page_token || '' : ''
    pageCount += 1
  } while (pageToken && pageCount < 20)

  return records
}

async function cachedSearchIndex(token) {
  if (searchIndexCache?.expiresAt > Date.now()) return searchIndexCache.records
  if (searchIndexPromise) return searchIndexPromise

  searchIndexPromise = listSearchRecords(token)
    .then((records) => {
      searchIndexCache = {
        records,
        expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
      }
      return records
    })
    .finally(() => {
      searchIndexPromise = null
    })
  return searchIndexPromise
}

async function focusedSearchRecords(token, rawQuery, query) {
  if (/^\d{1,6}$/.test(query)) {
    return listSearchRecords(token, {
      page_size: '100',
      filter: `CurrentValue.[编号]=${Number(query)}`,
    })
  }

  if (/^1[3-9]\d{9}$/.test(query)) {
    return listSearchRecords(token, {
      page_size: '100',
      filter: `CurrentValue.[你的微信注册手机号]="${query}"`,
    })
  }

  const conditions = [
    '你的微信号【微信昵称】',
    '你的抖音昵称',
    '你的抖音号id号',
  ].map((fieldName) => ({
    field_name: fieldName,
    operator: 'contains',
    value: [String(rawQuery).trim()],
  }))
  const records = []
  let pageToken = ''
  let pageCount = 0

  do {
    const params = new URLSearchParams({ page_size: '100' })
    if (pageToken) params.set('page_token', pageToken)
    const payload = await feishuJson(
      `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/search?${params}`,
      {
        token,
        method: 'POST',
        body: {
          field_names: SEARCH_FIELDS,
          filter: {
            conjunction: 'or',
            conditions,
          },
        },
      },
    )
    records.push(...(payload.data?.items || []))
    pageToken = payload.data?.has_more ? payload.data?.page_token || '' : ''
    pageCount += 1
  } while (pageToken && pageCount < 5)

  return records
}

function finalizeSearchRecords(records, query) {
  const matches = []
  for (const record of records) {
    if (isOldDuplicateRecord(record)) continue
    const score = scoreRecord(record, query)
    if (score) matches.push({ ...recordSummary(record), _score: score })
  }

  const seenPhones = new Set()
  return matches
    .sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score
      return Number(normalizeValue(b.fields['编号'])) - Number(normalizeValue(a.fields['编号']))
    })
    .filter((record) => {
      const phone = normalizeSearch(record.fields['你的微信注册手机号'])
      if (!phone) return true
      if (seenPhones.has(phone)) return false
      seenPhones.add(phone)
      return true
    })
    .slice(0, 20)
    .map(({ _score, ...record }) => record)
}

async function searchRecords(token, rawQuery) {
  const query = normalizeSearch(rawQuery)
  if (!query || query.length > 100) throw new Error('请输入 1–100 个字符进行搜索')

  try {
    const focused = await focusedSearchRecords(token, rawQuery, query)
    return finalizeSearchRecords(focused, query)
  } catch (error) {
    if (![1254000, 1254001, 1254002, 1254010, 1254018, 1254024, 1254045].includes(error?.code)) {
      throw error
    }
    const cached = await cachedSearchIndex(token)
    return finalizeSearchRecords(cached, query)
  }
}

async function nextUnreviewedRecord(
  token,
  rawAfterNumber,
  rawExcludedRecordIds = [],
  rawReviewMode = '',
) {
  const afterNumber = Number(normalizeValue(rawAfterNumber))
  const reviewMode = String(rawReviewMode || '').trim()
  const excludedRecordIds = new Set(
    (Array.isArray(rawExcludedRecordIds) ? rawExcludedRecordIds : [])
      .map((value) => String(value || '').trim())
      .filter((value) => /^rec[a-z0-9]+$/i.test(value))
      .slice(0, 500),
  )
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
    '直播筛选备注',
    '灯牌总和',
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
      if (excludedRecordIds.has(record.record_id)) continue
      if (isOldDuplicateRecord(record)) continue
      const status = normalizeValue(record.fields?.['初筛状态'])
      const result = normalizeValue(record.fields?.['直播筛选结果'])
      const lightboardTotal = normalizeValue(record.fields?.['灯牌总和'])
      if (result) continue
      if (reviewMode === 'lightboard' && /^\d{1,6}$/.test(lightboardTotal)) continue
      if (!isInitialScreenApproved(status)) continue

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

async function updateReview(
  token,
  recordId,
  result,
  rawNote,
  rawLightboardTotal = '',
  lightboardMode = false,
) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!['通过', '不通过'].includes(result)) throw new Error('审核结果只能是“通过”或“不通过”')
  const note = String(rawNote || '').trim()
  const lightboardTotal = String(rawLightboardTotal || '').trim()
  if (lightboardMode) {
    if (!/^\d{1,6}$/.test(lightboardTotal)) throw new Error('灯牌总和必须为非负整数')
  } else if (note.length > 500) {
    throw new Error('直播筛选备注不能超过 500 个字符')
  }

  const reviewTime = Date.now()
  const fields = {
    直播筛选结果: result,
    直播筛选时间: reviewTime,
    ...(lightboardMode
      ? { 灯牌总和: Number(lightboardTotal) }
      : { 直播筛选备注: note }),
  }
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    {
      token,
      method: 'PUT',
      body: {
        fields,
      },
    },
  )

  return {
    record_id: recordId,
    result,
    note: lightboardMode ? lightboardTotal : note,
    review_time: reviewTime,
    record: payload.data?.record,
  }
}

async function updateLightboardTotal(token, recordId, rawTotal) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const lightboardTotal = String(rawTotal || '').trim()
  if (!/^\d{1,6}$/.test(lightboardTotal)) throw new Error('灯牌总和必须为非负整数')

  const savedTime = Date.now()
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${BASE_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    {
      token,
      method: 'PUT',
      body: {
        fields: {
          灯牌总和: Number(lightboardTotal),
        },
      },
    },
  )

  return {
    record_id: recordId,
    result: '',
    note: lightboardTotal,
    saved_time: savedTime,
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

function validateFeishuMediaUrl(rawUrl, fileToken, kind) {
  if (!rawUrl) return ''

  try {
    const url = new URL(String(rawUrl))
    if (url.origin !== FEISHU_ORIGIN) return ''

    if (kind === 'temporary') {
      if (url.pathname !== '/open-apis/drive/v1/medias/batch_get_tmp_download_url') return ''
      const tokens = url.searchParams.getAll('file_tokens')
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
      return tokens.includes(fileToken) ? url.toString() : ''
    }

    const expectedPath = `/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`
    return url.pathname === expectedPath ? url.toString() : ''
  } catch {
    return ''
  }
}

function findTemporaryDownloadUrl(value, fileToken, allowUnscoped = false) {
  if (!value || typeof value !== 'object') return ''
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTemporaryDownloadUrl(item, fileToken, allowUnscoped)
      if (found) return found
    }
    return ''
  }

  const token = String(value.file_token || value.fileToken || value.token || '')
  const candidate = value.tmp_download_url || value.tmpDownloadUrl || value.download_url || ''
  if (candidate && (token === fileToken || allowUnscoped)) {
    try {
      const url = new URL(String(candidate))
      if (url.protocol === 'https:') return url.toString()
    } catch {
      // Continue searching nested response data.
    }
  }

  for (const child of Object.values(value)) {
    const found = findTemporaryDownloadUrl(child, fileToken, allowUnscoped)
    if (found) return found
  }
  return ''
}

async function getTemporaryAttachmentUrl(token, fileToken, rawTmpUrl) {
  const requestUrl = validateFeishuMediaUrl(rawTmpUrl, fileToken, 'temporary')
  if (!requestUrl) return ''

  const response = await remoteFetch(requestUrl, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || payload.code) {
    throw friendlyFeishuError(payload, response.ok ? 400 : response.status || 502)
  }

  return findTemporaryDownloadUrl(payload, fileToken)
    || findTemporaryDownloadUrl(payload, fileToken, true)
}

async function downloadAttachment(token, recordId, fieldName, fileToken, rawDownloadUrl) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!ATTACHMENT_FIELD_NAMES.has(fieldName)) throw new Error('不支持读取该附件字段')
  if (!fileToken || String(fileToken).length > 256) throw new Error('附件标识不正确')

  let extra = ''
  const providedUrl = validateFeishuMediaUrl(rawDownloadUrl, fileToken, 'download')
  let response = await remoteFetch(
    providedUrl
      || `${FEISHU_ORIGIN}/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`,
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

// --- Exchange review helpers ---

function exchangeRecordSummary(record) {
  const fields = record.fields || {}
  return {
    record_id: record.record_id,
    created_time: record.created_time,
    fields: Object.fromEntries(EXCHANGE_SEARCH_FIELDS.map((f) => [f, fields[f] ?? ''])),
  }
}

function isExchangeReviewed(record) {
  const fields = record.fields || {}
  return Boolean(normalizeValue(fields[EXCHANGE_REVIEW_RESULT_FIELD]))
}

async function listExchangeRecords(token, extraParams = {}) {
  const records = []
  let pageToken = ''
  let pageCount = 0

  do {
    const params = new URLSearchParams({
      page_size: '500',
      field_names: JSON.stringify([...EXCHANGE_SEARCH_FIELDS, EXCHANGE_REVIEW_RESULT_FIELD]),
      ...extraParams,
    })
    if (pageToken) params.set('page_token', pageToken)

    const payload = await feishuJson(
      `/open-apis/bitable/v1/apps/${EXCHANGE_BASE_TOKEN}/tables/${EXCHANGE_TABLE_ID}/records?${params}`,
      { token },
    )
    records.push(...(payload.data?.items || []))
    pageToken = payload.data?.has_more ? payload.data?.page_token || '' : ''
    pageCount += 1
  } while (pageToken && pageCount < 20)

  return records
}

async function getExchangeRecord(token, recordId) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${EXCHANGE_BASE_TOKEN}/tables/${EXCHANGE_TABLE_ID}/records/${recordId}`,
    { token },
  )
  return payload.data?.record
}

async function searchExchangeRecords(token, rawQuery) {
  const query = normalizeSearch(rawQuery)
  if (!query || query.length > 100) throw new Error('请输入 1–100 个字符进行搜索')

  // Try exact match on box number first
  if (/^\d{1,6}$/.test(query)) {
    try {
      const records = await listExchangeRecords(token, {
        page_size: '100',
        filter: `CurrentValue.[盲盒编号]="${query}"`,
      })
      if (records.length) {
        return records.map(exchangeRecordSummary)
      }
    } catch {
      // fall through to full search
    }
  }

  // Search by nickname
  const conditions = [
    { field_name: '昵称', operator: 'contains', value: [String(rawQuery).trim()] },
  ]

  try {
    const records = []
    let pageToken = ''
    let pageCount = 0
    do {
      const params = new URLSearchParams({ page_size: '100' })
      if (pageToken) params.set('page_token', pageToken)
      const payload = await feishuJson(
        `/open-apis/bitable/v1/apps/${EXCHANGE_BASE_TOKEN}/tables/${EXCHANGE_TABLE_ID}/records/search?${params}`,
        {
          token,
          method: 'POST',
          body: {
            field_names: [...EXCHANGE_SEARCH_FIELDS, EXCHANGE_REVIEW_RESULT_FIELD],
            filter: { conjunction: 'or', conditions },
          },
        },
      )
      records.push(...(payload.data?.items || []))
      pageToken = payload.data?.has_more ? payload.data?.page_token || '' : ''
      pageCount += 1
    } while (pageToken && pageCount < 5)

    return records.map(exchangeRecordSummary).slice(0, 20)
  } catch {
    // Fallback: scan all records and filter locally
    const allRecords = await listExchangeRecords(token)
    const lowerQuery = query
    return allRecords
      .filter((r) => {
        const fields = r.fields || {}
        return EXCHANGE_SEARCH_FIELDS.some((f) =>
          normalizeSearch(fields[f]).includes(lowerQuery),
        )
      })
      .map(exchangeRecordSummary)
      .slice(0, 20)
  }
}

async function nextUnreviewedExchange(token, rawAfterNumber, rawExcludedRecordIds = []) {
  const afterNumber = rawAfterNumber ? Number(rawAfterNumber) : 0
  const excludedRecordIds = new Set(
    (Array.isArray(rawExcludedRecordIds) ? rawExcludedRecordIds : [])
      .map((v) => String(v || '').trim())
      .filter((v) => /^rec[a-z0-9]+$/i.test(v))
      .slice(0, 500),
  )

  const allRecords = await listExchangeRecords(token)
  const candidate = allRecords.find((r) => {
    if (excludedRecordIds.has(r.record_id)) return false
    if (isExchangeReviewed(r)) return false
    const number = Number(normalizeValue(r.fields?.['盲盒编号']))
    return number > afterNumber
  })

  return candidate ? exchangeRecordSummary(candidate) : null
}

async function updateExchangeReview(token, recordId, result, rawNote) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!['通过', '不通过'].includes(result)) throw new Error('审核结果只能是"通过"或"不通过"')
  const note = String(rawNote || '').trim().slice(0, 500)

  const reviewTime = Date.now()
  const fields = {
    [EXCHANGE_REVIEW_RESULT_FIELD]: result,
    [EXCHANGE_REVIEW_TIME_FIELD]: reviewTime,
    [EXCHANGE_REVIEW_NOTE_FIELD]: note,
  }

  const payload = await feishuJson(
    `/open-apis/bitable/v1/apps/${EXCHANGE_BASE_TOKEN}/tables/${EXCHANGE_TABLE_ID}/records/${recordId}`,
    { token, method: 'PUT', body: { fields } },
  )

  return {
    record_id: recordId,
    result,
    note,
    review_time: reviewTime,
    record: payload.data?.record,
  }
}

// ---

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
      const record = await nextUnreviewedRecord(
        token,
        body.afterNumber,
        body.excludeRecordIds,
        body.reviewMode,
      )
      sendJson(res, 200, { record })
      return
    }

    if (pathname === '/api/feishu/review') {
      if (body.prepare === true) {
        sendJson(res, 200, { ready: true })
        return
      }

      const data = body.lightboardOnly === true
        ? await updateLightboardTotal(
          token,
          String(body.recordId || ''),
          body.lightboardTotal,
        )
        : await updateReview(
          token,
          String(body.recordId || ''),
          String(body.result || '').trim(),
          body.note,
          body.lightboardTotal,
          body.lightboardMode === true,
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
        String(body.downloadUrl || ''),
      )
      res.statusCode = 200
      res.setHeader('Content-Type', attachment.headers.get('content-type') || 'application/octet-stream')
      res.setHeader('Cache-Control', 'private, max-age=300')
      const contentLength = attachment.headers.get('content-length')
      if (contentLength) res.setHeader('Content-Length', contentLength)
      if (!attachment.body) {
        res.end()
        return
      }
      for await (const chunk of attachment.body) {
        res.write(Buffer.from(chunk))
      }
      res.end()
      return
    }

    if (pathname === '/api/feishu/attachment-url') {
      const fileToken = String(body.fileToken || '')
      if (!fileToken || fileToken.length > 256) throw new Error('附件标识不正确')
      const url = await getTemporaryAttachmentUrl(
        token,
        fileToken,
        String(body.tmpUrl || ''),
      )
      sendJson(res, 200, { url })
      return
    }

    // --- Exchange review endpoints ---

    if (pathname === '/api/feishu/exchange-search') {
      const records = await searchExchangeRecords(token, body.query)
      sendJson(res, 200, { records })
      return
    }

    if (pathname === '/api/feishu/exchange-record') {
      const record = await getExchangeRecord(token, String(body.recordId || ''))
      sendJson(res, 200, { record })
      return
    }

    if (pathname === '/api/feishu/exchange-next') {
      const record = await nextUnreviewedExchange(
        token,
        body.afterNumber,
        body.excludeRecordIds,
      )
      sendJson(res, 200, { record })
      return
    }

    if (pathname === '/api/feishu/exchange-review') {
      const data = await updateExchangeReview(
        token,
        String(body.recordId || ''),
        String(body.result || '').trim(),
        body.note,
      )
      sendJson(res, 200, data)
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
