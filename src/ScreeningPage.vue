<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import JSZip from 'jszip'
import Papa from 'papaparse'
import './screening.css'

const ATTACHMENT_FIELDS = [
  '你参加过哪些鲲鹏产品的内测或公测活动？ 2',
  '请提供你发布作品的截图',
  '请提供和鲲鹏团队反馈问题的沟通截图',
  '请提供证明截图',
  '请提供证明截图 2',
  '请提供观看粉丝灯牌截图',
  '请提供观看粉丝灯牌截图 2',
  '请提供张导的店会员等级截图',
]

const TRAFFIC_CARD_DETAIL_FIELD = '请列出流量卡的累计充值金额，并提供ICCID。'
const STANDARDIZED_ICCID_FIELD = 'ICCID标准化'
const IMAGE_REVEAL_GAP_MS = 220
const SEARCH_RESULT_CACHE_TTL_MS = 60 * 1000

const GROUPS = [
  {
    id: 'device',
    label: '设备经历',
    questions: [
      {
        number: 5,
        question: '你是否用过 5G 随身 WiFi / CPE 产品？',
        shortLabel: '使用过 5G CPE',
        fields: ['你是否用过5G 随身WiFi/CPE产品?'],
        compact: true,
      },
      {
        number: 6,
        question: '你是否有鲲鹏 5G CPE 产品？',
        shortLabel: '拥有鲲鹏 5G CPE',
        fields: ['你是否有鲲鹏5G CPE产品？ 3'],
        compact: true,
      },
      {
        number: 9,
        question: '你有鲲鹏的哪些 5G CPE 产品？',
        fields: ['你有鲲鹏的哪些5G CPE产品？ 2'],
        detailFields: ['请列出CPE产品，并且提供每个产品的MAC地址'],
        detailLabel: 'CPE 产品资料（MAC 已隐藏）',
      },
      {
        number: 11,
        question: '你是否用过鲲鹏的流量卡？',
        shortLabel: '使用过鲲鹏流量卡',
        fields: ['你是否用过鲲鹏的流量卡？'],
        compact: true,
      },
    ],
  },
  {
    id: 'contribution',
    label: '参与贡献',
    questions: [
      {
        number: 13,
        question: '你是否参加过鲲鹏产品的内测或公测活动？',
        shortLabel: '参加内测或公测',
        fields: ['你是否参加过鲲鹏产品的内测或公测活动？'],
        compact: true,
        evidence: {
          number: 14,
          field: '你参加过哪些鲲鹏产品的内测或公测活动？ 2',
          question: '请提供参加内测或公测活动的资料',
        },
      },
      {
        number: 15,
        question: '你参加过鲲鹏产品的种草活动？',
        shortLabel: '参加产品种草活动',
        fields: ['你参加过鲲鹏产品的种草活动？ 2'],
        compact: true,
        evidence: {
          number: 16,
          field: '请提供你发布作品的截图',
          question: '请提供你发布作品的截图',
        },
      },
      {
        number: 17,
        question: '你是否给鲲鹏团队反馈过问题，帮助优化产品？',
        shortLabel: '反馈问题帮助优化',
        fields: ['你是否给鲲鹏团队反馈过问题帮助优化产品？ 2'],
        compact: true,
        evidence: {
          number: 18,
          field: '请提供和鲲鹏团队反馈问题的沟通截图',
          question: '请提供和鲲鹏团队反馈问题的沟通截图',
        },
      },
      {
        number: 19,
        question: '你是否给身边的朋友推荐过鲲鹏的产品？',
        shortLabel: '向朋友推荐产品',
        fields: ['你是否给身边的朋友推荐过鲲鹏的产品？ 2'],
        compact: true,
        evidence: {
          number: 20,
          field: '请提供证明截图',
          question: '请提供推荐鲲鹏产品的证明截图',
        },
      },
      {
        number: 21,
        question: '你是否在其他媒体渠道发布过鲲鹏产品的开箱内容？',
        shortLabel: '发布过产品开箱',
        fields: ['你是否在其他媒体渠道发布过鲲鹏产品的开箱内容？'],
        compact: true,
        evidence: {
          number: 22,
          field: '请提供证明截图 2',
          question: '请提供开箱内容的证明截图',
        },
      },
    ],
  },
  {
    id: 'fan',
    label: '粉丝互动',
    questions: [
      {
        number: 23,
        question: '你是否观看鲲鹏张导抖音的直播？',
        shortLabel: '观看鲲鹏张导直播',
        fields: ['你是否观看鲲鹏张导抖音的直播？'],
        compact: true,
        evidence: {
          number: 24,
          field: '请提供观看粉丝灯牌截图',
          question: '请提供鲲鹏张导粉丝灯牌截图',
        },
      },
      {
        number: 25,
        question: '你是否观看张导严选抖音号的直播？',
        shortLabel: '观看张导严选直播',
        fields: ['你是否观看张导严选抖音号的直播？'],
        compact: true,
        evidence: {
          number: 26,
          field: '请提供观看粉丝灯牌截图 2',
          question: '请提供张导严选粉丝灯牌截图',
        },
      },
      {
        number: 27,
        question: '你是否有注册张导严选小店？',
        shortLabel: '注册张导严选小店',
        fields: ['你是否有注册张导严选小店'],
        compact: true,
        evidence: {
          number: 29,
          field: '请提供张导的店会员等级截图',
          question: '请提供张导的店会员等级截图',
        },
      },
    ],
  },
  {
    id: 'story',
    label: '申请表达',
    questions: [
      {
        number: 30,
        question: '你为什么需要天火卡？',
        fields: ['你为什么需要天火卡？'],
        long: true,
      },
      {
        number: 31,
        question: '留下你想对张导说的话',
        fields: ['留下你想对张导说的话'],
        long: true,
      },
    ],
  },
]

const bundleInput = ref(null)
const csvInput = ref(null)
const csvFile = ref(null)
const zipFile = ref(null)
const needsSeparateCsv = ref(false)
const importState = ref('idle')
const importMessage = ref('')
const isPublicDeployment = !['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const sourceMode = ref('feishu')
const feishuAppId = ref('')
const feishuAppSecret = ref('')
const publicAccessKey = ref('')
const feishuQuery = ref('')
const feishuSearchState = ref('idle')
const feishuMessage = ref('')
const feishuResults = ref([])
const decisionSyncState = ref('idle')
const decisionSyncMessage = ref('')
const nextPrefetchState = ref('idle')
const reviewNote = ref('')
const records = ref([])
const currentIndex = ref(0)
const zipArchive = ref(null)
const attachmentIndex = ref(new Map())
const currentImages = ref(new Map())
const imageLoading = ref(false)
const lightboxImage = ref(null)
const decisions = ref({})
const revealResult = ref(null)
const batchStorageKey = ref('')
const batchName = ref('天火卡申请名单')
const autoExported = ref(false)
const validation = ref({ attachments: 0, missing: 0, multiple: 0 })
let decisionTimer
let imageLoadToken = 0
let objectUrls = []
let nextPrefetchVersion = 0
let nextRecordPrefetch = null
const remoteImageCache = new Map()
const remoteAttachmentDownloadCache = new Map()
const feishuSearchCache = new Map()

const current = computed(() => records.value[currentIndex.value] || null)
const reviewedCount = computed(() => Object.keys(decisions.value).length)
const progressPercent = computed(() => (
  records.value.length ? Math.round((reviewedCount.value / records.value.length) * 100) : 0
))
const currentDecision = computed(() => (
  current.value ? decisions.value[current.value.id] : null
))
const nextPrefetchLabel = computed(() => {
  if (current.value?.remote && currentIndex.value < records.value.length - 1) {
    return '下一位已加载'
  }
  return {
    loading: '下一位预载中',
    ready: '下一位已预载',
    complete: '已预载到队尾',
    error: '下一位将按需加载',
  }[nextPrefetchState.value] || ''
})

function normalizeText(value) {
  if (Array.isArray(value)) return value.map(normalizeText).filter(Boolean).join('\n')
  if (value && typeof value === 'object') {
    return normalizeText(value.text ?? value.name ?? value.value ?? '')
  }
  return String(value ?? '').replace(/\r\n/g, '\n').trim()
}

function formatFeishuTime(value) {
  const timestamp = Number(value)
  if (!timestamp) return normalizeText(value) || '时间未知'
  const milliseconds = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp
  return new Date(milliseconds).toLocaleString('zh-CN', { hour12: false })
}

function maskPhone(value) {
  const phone = normalizeText(value).replace(/\D/g, '')
  if (!/^1[3-9]\d{9}$/.test(phone)) return '手机号未识别'
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

function normalizeIccid(value) {
  const source = normalizeText(value).toUpperCase()
  const matched = source.match(/89(?:[\s-]?[0-9DOIL]){17,18}/)?.[0] || ''
  const normalized = matched
    .replace(/[\s-]/g, '')
    .replace(/[DO]/g, '0')
    .replace(/[IL]/g, '1')

  return /^89\d{17,18}$/.test(normalized) ? normalized : ''
}

function maskIccid(value) {
  const normalized = normalizeIccid(value)
  if (!normalized) return '[ICCID 已隐藏]'
  return `${normalized.slice(0, 4)} •••• •••• •••• ${normalized.slice(-4)}`
}

function redactSensitive(value) {
  return normalizeText(value)
    .replace(/\b1[3-9]\d{9}\b/g, '[手机号已隐藏]')
    .replace(/\b(?:[0-9a-f]{2}[:-]?){5}[0-9a-f]{2}\b/gi, '[MAC 已隐藏]')
    .replace(/\b89[0-9DOILdoil]{17,18}\b/g, (match) => maskIccid(match))
    .replace(/\bwxid_[a-z0-9_]+\b/gi, '[微信号已隐藏]')
}

function buildTrafficCard(row) {
  const raw = normalizeText(row[TRAFFIC_CARD_DETAIL_FIELD])
  const normalizedIccid = normalizeIccid(row[STANDARDIZED_ICCID_FIELD])
    || normalizeIccid(raw)

  return {
    hasContent: Boolean(raw || normalizedIccid),
    submission: raw ? redactSensitive(raw) : '未填写',
    normalizedIccid,
    maskedIccid: normalizedIccid ? maskIccid(normalizedIccid) : '未识别',
  }
}

function getWechatNickname(value) {
  const text = normalizeText(value)
  if (!text) return ''

  const nicknameLine = text
    .split('\n')
    .find((line) => /昵称[：:]/.test(line))

  if (nicknameLine) {
    return redactSensitive(nicknameLine.replace(/^.*?昵称[：:]\s*/, ''))
  }

  if (/wxid_|微信号[：:]|\b1[3-9]\d{9}\b/i.test(text)) return ''
  return redactSensitive(text)
}

function readFields(row, fields = []) {
  const values = fields
    .map((field) => redactSensitive(row[field]))
    .filter(Boolean)

  return [...new Set(values)].join('\n')
}

function buildQuestion(row, config) {
  return {
    ...config,
    answer: readFields(row, config.fields) || '未填写',
    detail: readFields(row, config.detailFields),
  }
}

function buildRecord(row, index) {
  const id = normalizeText(row['编号']) || String(index + 1)
  const douyinNickname = redactSensitive(row['你的抖音昵称'])
  const wechatNickname = getWechatNickname(row['你的微信号【微信昵称】'])
  const wechatPhone = normalizeText(row['你的微信注册手机号'])

  return {
    id,
    nickname: douyinNickname || wechatNickname || `申请人 ${id}`,
    wechatNickname,
    wechatPhone,
    submittedAt: row._createdTime
      ? formatFeishuTime(row._createdTime)
      : normalizeText(row['提交时间']) || '时间未知',
    remote: Boolean(row._remote),
    recordId: normalizeText(row._recordId),
    reviewNote: normalizeText(row['直播筛选备注']),
    trafficCard: buildTrafficCard(row),
    groups: GROUPS.map((group) => ({
      ...group,
      questions: group.questions.map((question) => buildQuestion(row, question)),
    })),
    row,
  }
}

function isOldDuplicateRow(row) {
  return [
    row['手机号重复'],
    row['MAC重复'],
    row['初筛状态'],
  ].some((value) => /重复[·・\s_-]*旧记录|旧记录/.test(normalizeText(value)))
}

function parseCsv(source) {
  return new Promise((resolve, reject) => {
    Papa.parse(source, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: ({ data, errors, meta }) => {
        const fatalErrors = errors.filter((error) => error.type === 'Quotes')
        if (fatalErrors.length) {
          reject(new Error(`CSV 格式错误：${fatalErrors[0].message}`))
          return
        }
        resolve({ data, fields: meta.fields || [] })
      },
      error: reject,
    })
  })
}

function parseAttachmentEntry(path) {
  const normalized = path.replace(/\\/g, '/')
  if (
    normalized.endsWith('/')
    || normalized.startsWith('__MACOSX/')
    || normalized.split('/').some((part) => part.startsWith('.'))
  ) return null

  const parts = normalized.split('/').filter(Boolean)
  if (parts.length < 2) return null

  const field = parts.at(-2)
  const filename = parts.at(-1)
  const match = filename.match(/^(.+?)(?:\((\d+)\))?\.(jpe?g|png|webp|gif|bmp)$/i)
  if (!match || !ATTACHMENT_FIELDS.includes(field)) return null

  return {
    field,
    id: match[1],
    order: Number(match[2] || 0),
    filename,
    path: normalized,
  }
}

function buildAttachmentIndex(zip) {
  const index = new Map()

  Object.keys(zip.files).forEach((path) => {
    const parsed = parseAttachmentEntry(path)
    if (!parsed) return

    if (!index.has(parsed.field)) index.set(parsed.field, new Map())
    const fieldRows = index.get(parsed.field)
    if (!fieldRows.has(parsed.id)) fieldRows.set(parsed.id, [])
    fieldRows.get(parsed.id).push(parsed)
  })

  index.forEach((fieldRows) => {
    fieldRows.forEach((entries) => {
      entries.sort((a, b) => a.order - b.order || a.filename.localeCompare(b.filename, 'zh-CN'))
    })
  })

  return index
}

function attachmentEntries(field, id) {
  return attachmentIndex.value.get(field)?.get(String(id)) || []
}

function questionImages(question) {
  if (!question.evidence) return []
  return currentImages.value.get(question.evidence.field) || []
}

function questionExpectedImageCount(question) {
  if (!question.evidence || !current.value) return 0
  if (current.value.remote) {
    return remoteAttachments(current.value.row[question.evidence.field]).length
  }
  return attachmentEntries(question.evidence.field, current.value.id).length
}

function questionImagesLoading(question) {
  return imageLoading.value
    && questionImages(question).length < questionExpectedImageCount(question)
}

function compactQuestions(group) {
  return group.questions.filter((question) => question.compact && !question.evidence)
}

function detailQuestions(group) {
  return group.questions.filter((question) => !question.compact)
}

function answerTone(answer) {
  const value = normalizeText(answer)
  if (value === '是') return 'answer-yes'
  if (value === '否') return 'answer-no'
  return ''
}

function shouldShowEvidence(answer) {
  return normalizeText(answer) === '是'
}

function linkedQuestions(group) {
  return group.questions.filter((question) => question.evidence)
}

function revokeObjectUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url))
  objectUrls = []
  remoteImageCache.clear()
  remoteAttachmentDownloadCache.clear()
}

function cacheRemoteImages(recordId, imageMap) {
  remoteImageCache.delete(recordId)
  remoteImageCache.set(recordId, imageMap)

  while (remoteImageCache.size > 3) {
    const oldestKey = remoteImageCache.keys().next().value
    const oldestImages = remoteImageCache.get(oldestKey)
    const expiredUrls = new Set(
      [...oldestImages.values()].flat().map((image) => image.src),
    )
    expiredUrls.forEach((url) => URL.revokeObjectURL(url))
    objectUrls = objectUrls.filter((url) => !expiredUrls.has(url))
    remoteImageCache.delete(oldestKey)
  }
}

function remoteAttachments(value) {
  const items = Array.isArray(value) ? value : value ? [value] : []
  return items
    .map((item) => ({
      fileToken: normalizeText(item?.file_token ?? item?.fileToken ?? item?.token),
      filename: normalizeText(item?.name ?? item?.file_name) || '飞书原图',
      tmpUrl: normalizeText(item?.tmp_url ?? item?.tmpUrl),
      downloadUrl: normalizeText(item?.url ?? item?.download_url ?? item?.downloadUrl),
    }))
    .filter((item) => item.fileToken)
}

function visibleAttachmentFields(record) {
  return record.groups.flatMap((group) => (
    group.questions
      .filter((question) => question.evidence && shouldShowEvidence(question.answer))
      .map((question) => question.evidence.field)
  ))
}

function buildRemoteFeishuRecord(feishuRecord) {
  const row = {
    ...(feishuRecord.fields || {}),
    _remote: true,
    _recordId: feishuRecord.record_id,
    _createdTime: feishuRecord.created_time,
  }
  return buildRecord(row, 0)
}

function prepareRemoteAttachmentDownloads(record) {
  const cached = remoteAttachmentDownloadCache.get(record.recordId)
  if (cached) return cached

  const tasks = visibleAttachmentFields(record).flatMap((field) => (
    remoteAttachments(record.row[field]).map((entry) => ({ field, entry }))
  ))
  const slots = tasks.map(() => {
    let resolve
    const promise = new Promise((slotResolve) => {
      resolve = slotResolve
    })
    return { promise, resolve }
  })
  let cursor = 0

  const worker = async () => {
    while (cursor < tasks.length) {
      const taskIndex = cursor
      cursor += 1
      const { field, entry } = tasks[taskIndex]
      try {
        if (entry.tmpUrl) {
          try {
            const temporary = await feishuRequest('/api/feishu/attachment-url', {
              fileToken: entry.fileToken,
              tmpUrl: entry.tmpUrl,
            })
            if (temporary.url) {
              slots[taskIndex].resolve({ field, entry, url: temporary.url })
              continue
            }
          } catch {
            // Older records may not provide a usable temporary URL; use the proxy fallback.
          }
        }

        const blob = await feishuRequest('/api/feishu/attachment', {
          recordId: record.recordId,
          fieldName: field,
          fileToken: entry.fileToken,
          downloadUrl: entry.downloadUrl,
        }, { blob: true })
        slots[taskIndex].resolve({ field, entry, blob })
      } catch (error) {
        slots[taskIndex].resolve({ field, entry, error })
      }
    }
  }

  const workers = Promise.all(
    Array.from({ length: Math.min(3, tasks.length) }, () => worker()),
  )
  const prepared = { slots, workers }
  remoteAttachmentDownloadCache.set(record.recordId, prepared)
  return prepared
}

function cancelNextPrefetch() {
  nextPrefetchVersion += 1
  nextRecordPrefetch = null
  nextPrefetchState.value = 'idle'
}

async function feishuRequest(path, payload = {}, { blob = false } = {}) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appId: feishuAppId.value.trim(),
      appSecret: feishuAppSecret.value.trim(),
      accessKey: publicAccessKey.value,
      ...payload,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || '飞书请求失败')
  }

  return blob ? response.blob() : response.json()
}

async function fetchFeishuRecord(summary) {
  const data = await feishuRequest('/api/feishu/record', {
    recordId: summary.record_id,
  })
  if (!data.record) throw new Error('飞书没有返回该条记录')
  return data.record
}

function warmReviewEndpoint() {
  feishuRequest('/api/feishu/review', { prepare: true }).catch(() => {})
}

function startNextRecordPrefetch(record) {
  if (!record?.remote) {
    cancelNextPrefetch()
    return
  }

  const version = ++nextPrefetchVersion
  const fromNumber = normalizeText(record.id)
  nextPrefetchState.value = 'loading'

  const promise = (async () => {
    const data = await feishuRequest('/api/feishu/next', { afterNumber: fromNumber })
    if (!data.record) return null
    const nextRecord = await fetchFeishuRecord(data.record)
    prepareRemoteAttachmentDownloads(buildRemoteFeishuRecord(nextRecord))
    return nextRecord
  })()

  nextRecordPrefetch = { version, fromNumber, promise }
  promise
    .then((nextRecord) => {
      if (nextRecordPrefetch?.version !== version) return
      nextPrefetchState.value = nextRecord ? 'ready' : 'complete'
    })
    .catch(() => {
      if (nextRecordPrefetch?.version !== version) return
      nextPrefetchState.value = 'error'
    })
}

async function consumeNextRecordPrefetch(afterNumber) {
  const cached = nextRecordPrefetch
  if (!cached || cached.fromNumber !== normalizeText(afterNumber)) {
    return { matched: false, record: null }
  }

  try {
    const record = await cached.promise
    if (nextRecordPrefetch?.version === cached.version) {
      nextRecordPrefetch = null
      nextPrefetchState.value = 'idle'
    }
    return { matched: true, record }
  } catch {
    if (nextRecordPrefetch?.version === cached.version) {
      nextRecordPrefetch = null
      nextPrefetchState.value = 'error'
    }
    return { matched: false, record: null }
  }
}

async function searchFeishu() {
  if (feishuSearchState.value === 'loading') return
  if (!isPublicDeployment && (!feishuAppId.value.trim() || !feishuAppSecret.value.trim())) {
    feishuSearchState.value = 'error'
    feishuMessage.value = '请先填写 App ID 和 App Secret'
    return
  }
  if (isPublicDeployment && !publicAccessKey.value) {
    feishuSearchState.value = 'error'
    feishuMessage.value = '请输入审核访问口令'
    return
  }
  if (!feishuQuery.value.trim()) {
    feishuSearchState.value = 'error'
    feishuMessage.value = '请输入编号、手机号、微信或抖音昵称进行搜索'
    return
  }

  const searchKey = normalizeText(feishuQuery.value).toLowerCase()
  const cachedSearch = feishuSearchCache.get(searchKey)
  if (cachedSearch?.expiresAt > Date.now()) {
    feishuResults.value = cachedSearch.records
    feishuSearchState.value = 'ready'
    feishuMessage.value = cachedSearch.records.length
      ? `从缓存找到 ${cachedSearch.records.length} 条匹配记录`
      : '没有找到匹配记录，请换编号、手机号或昵称重试'
    return
  }

  feishuSearchState.value = 'loading'
  feishuMessage.value = '正在读取飞书真实记录…'
  feishuResults.value = []

  try {
    const data = await feishuRequest('/api/feishu/search', { query: feishuQuery.value })
    feishuResults.value = data.records || []
    feishuSearchCache.set(searchKey, {
      records: feishuResults.value,
      expiresAt: Date.now() + SEARCH_RESULT_CACHE_TTL_MS,
    })
    feishuSearchState.value = 'ready'
    feishuMessage.value = feishuResults.value.length
      ? `找到 ${feishuResults.value.length} 条匹配记录，请选择要审核的人`
      : '没有找到匹配记录，请换编号、手机号或昵称重试'
  } catch (error) {
    feishuSearchState.value = 'error'
    feishuMessage.value = error?.message || '搜索飞书记录失败'
  }
}

async function openNextUnreviewed(afterNumber = '') {
  if (!isPublicDeployment && (!feishuAppId.value.trim() || !feishuAppSecret.value.trim())) {
    feishuSearchState.value = 'error'
    feishuMessage.value = '请先填写 App ID 和 App Secret'
    return
  }
  if (isPublicDeployment && !publicAccessKey.value) {
    feishuSearchState.value = 'error'
    feishuMessage.value = '请输入审核访问口令'
    return
  }
  if (feishuSearchState.value === 'opening') return

  feishuSearchState.value = 'opening'
  if (current.value) {
    decisionSyncState.value = 'saving'
    decisionSyncMessage.value = '正在打开下一条未审核记录…'
  } else {
    feishuMessage.value = '正在查找下一条未审核记录…'
  }

  try {
    const prefetched = await consumeNextRecordPrefetch(afterNumber)
    if (prefetched.matched) {
      if (!prefetched.record) {
        feishuSearchState.value = 'ready'
        if (current.value) {
          decisionSyncState.value = 'success'
          decisionSyncMessage.value = '全部未审核记录已处理完成'
        } else {
          feishuMessage.value = '没有找到符合初筛条件的未审核记录'
        }
        return
      }

      await activateFeishuRecord(prefetched.record)
      return
    }

    const data = await feishuRequest('/api/feishu/next', { afterNumber })
    if (!data.record) {
      feishuSearchState.value = 'ready'
      if (current.value) {
        decisionSyncState.value = 'success'
        decisionSyncMessage.value = '没有更多符合初筛条件的未审核记录'
      } else {
        feishuMessage.value = '没有找到符合初筛条件的未审核记录'
      }
      return
    }
    // “下一条”接口本身也使用 opening 状态；先释放该状态，避免
    // openFeishuRecord 将这次正常的后续加载误判为重复点击。
    feishuSearchState.value = 'ready'
    await openFeishuRecord(data.record)
    if (feishuSearchState.value === 'error' && current.value) {
      decisionSyncState.value = 'error'
      decisionSyncMessage.value = `下一条记录载入失败：${feishuMessage.value || '请手动返回搜索'}`
    }
  } catch (error) {
    feishuSearchState.value = 'error'
    if (current.value) {
      decisionSyncState.value = 'error'
      decisionSyncMessage.value = `下一条记录载入失败：${error?.message || '请手动返回搜索'}`
    } else {
      feishuMessage.value = error?.message || '查找下一条未审核记录失败'
    }
  }
}

function summarizeRemoteValidation(record) {
  let attachments = 0
  let multiple = 0
  let missing = 0

  for (const field of ATTACHMENT_FIELDS) {
    const count = remoteAttachments(record.row[field]).length
    attachments += count
    if (count > 1) multiple += 1
  }

  for (const group of record.groups) {
    for (const question of group.questions.filter((item) => item.evidence)) {
      if (shouldShowEvidence(question.answer)
        && remoteAttachments(record.row[question.evidence.field]).length === 0) {
        missing += 1
      }
    }
  }

  return { attachments, missing, multiple }
}

async function activateFeishuRecord(feishuRecord) {
  const built = buildRemoteFeishuRecord(feishuRecord)
  const row = built.row
  const existingIndex = records.value.findIndex((record) => (
    record.remote && record.recordId === built.recordId
  ))
  if (existingIndex >= 0) {
    records.value = records.value.map((record, index) => (
      index === existingIndex ? built : record
    ))
    currentIndex.value = existingIndex
  } else if (records.value.length && records.value.every((record) => record.remote)) {
    records.value = [...records.value, built]
    currentIndex.value = records.value.length - 1
  } else {
    records.value = [built]
    currentIndex.value = 0
    decisions.value = {}
  }
  zipArchive.value = null
  batchStorageKey.value = ''
  batchName.value = '飞书实时审核'
  autoExported.value = false
  decisionSyncState.value = 'idle'
  decisionSyncMessage.value = ''
  reviewNote.value = built.reviewNote
  lightboxImage.value = null
  revealResult.value = null
  currentImages.value = new Map()

  const previousResult = normalizeText(row['直播筛选结果'])
  if (previousResult) {
    decisions.value = {
      ...decisions.value,
      [built.id]: {
        result: previousResult,
        time: formatFeishuTime(row['直播筛选时间']),
        note: built.reviewNote,
      },
    }
  }

  validation.value = summarizeRemoteValidation(built)
  feishuSearchState.value = 'ready'
  feishuMessage.value = ''
  await nextTick()

  // 审核员查看当前问答和图片时，在后台准备下一位的完整记录。
  warmReviewEndpoint()
  startNextRecordPrefetch(built)
  await loadCurrentImages()
}

async function openFeishuRecord(summary) {
  if (feishuSearchState.value === 'opening') return
  feishuSearchState.value = 'opening'
  feishuMessage.value = '正在载入完整问答和原图…'

  try {
    const record = await fetchFeishuRecord(summary)
    await activateFeishuRecord(record)
  } catch (error) {
    feishuSearchState.value = 'error'
    feishuMessage.value = error?.message || '载入飞书记录失败'
  }
}

async function loadCurrentImages() {
  const record = current.value
  if (!record) {
    currentImages.value = new Map()
    return
  }

  const token = ++imageLoadToken
  imageLoading.value = true
  if (!record.remote) revokeObjectUrls()

  const imageMap = new Map()
  const orderedAttachmentFields = visibleAttachmentFields(record)

  if (record.remote) {
    const cachedImages = remoteImageCache.get(record.recordId)
    if (cachedImages) {
      remoteImageCache.delete(record.recordId)
      remoteImageCache.set(record.recordId, cachedImages)
      currentImages.value = cachedImages
      imageLoading.value = false
      return
    }

    const { slots: downloadSlots, workers: downloadWorkers } =
      prepareRemoteAttachmentDownloads(record)
    const results = new Array(downloadSlots.length)
    let failedImages = 0
    let lastImageError = ''

    // 下载可以并行，但渲染严格按题目顺序逐张进行。
    for (let taskIndex = 0; taskIndex < downloadSlots.length; taskIndex += 1) {
      const downloaded = await downloadSlots[taskIndex].promise
      if (token !== imageLoadToken) return

      if (downloaded.error) {
        failedImages += 1
        lastImageError = downloaded.error?.message || '请检查附件权限'
        continue
      }

      const { field, entry, blob } = downloaded
      const url = downloaded.url || URL.createObjectURL(blob)
      if (!downloaded.url) objectUrls.push(url)
      results[taskIndex] = {
        field,
        image: { src: url, filename: entry.filename, label: field },
      }

      const progressiveImages = results
        .filter((result) => result?.field === field)
        .map((result) => result.image)
      const progressiveMap = new Map(currentImages.value)
      progressiveMap.set(field, progressiveImages)
      currentImages.value = progressiveMap
      await nextTick()

      if (taskIndex < downloadSlots.length - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, IMAGE_REVEAL_GAP_MS))
      }
    }
    await downloadWorkers
    if (token !== imageLoadToken) return
    remoteAttachmentDownloadCache.delete(record.recordId)

    for (const [field, images] of currentImages.value) imageMap.set(field, images)

    if (failedImages) {
      decisionSyncMessage.value = `${failedImages} 张飞书原图读取失败：${lastImageError}`
    }

    if (token === imageLoadToken) {
      cacheRemoteImages(record.recordId, imageMap)
      currentImages.value = imageMap
      imageLoading.value = false
    }
    return
  }

  if (!zipArchive.value) {
    currentImages.value = new Map()
    imageLoading.value = false
    return
  }

  for (const field of orderedAttachmentFields) {
    const entries = attachmentEntries(field, record.id)
    const images = []

    for (const entry of entries) {
      const zipEntry = zipArchive.value.file(entry.path)
      if (!zipEntry) continue
      const blob = await zipEntry.async('blob')
      if (token !== imageLoadToken) return

      const url = URL.createObjectURL(blob)
      objectUrls.push(url)
      images.push({
        src: url,
        filename: entry.filename,
        label: field,
      })
      imageMap.set(field, [...images])
      currentImages.value = new Map(imageMap)
    }

    if (images.length) imageMap.set(field, images)
  }

  if (token === imageLoadToken) {
    currentImages.value = imageMap
    imageLoading.value = false
  }
}

function loadSavedDecisions(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '{}')
    return saved && typeof saved === 'object' ? saved : {}
  } catch {
    return {}
  }
}

function persistDecisions() {
  if (!batchStorageKey.value) return
  localStorage.setItem(batchStorageKey.value, JSON.stringify(decisions.value))
}

async function importBatch() {
  if (!zipFile.value || importState.value === 'loading') return

  importState.value = 'loading'
  importMessage.value = '正在读取压缩包、数据和附件索引…'

  try {
    const zip = await JSZip.loadAsync(zipFile.value, { createFolders: false })
    const csvEntries = Object.values(zip.files)
      .filter((entry) => (
        !entry.dir
        && /\.csv$/i.test(entry.name)
        && !entry.name.startsWith('__MACOSX/')
        && !entry.name.split('/').some((part) => part.startsWith('.'))
      ))
      .sort((a, b) => {
        const aDepth = a.name.split('/').length
        const bDepth = b.name.split('/').length
        return aDepth - bDepth || a.name.localeCompare(b.name, 'zh-CN')
      })

    let csvSource = csvFile.value
    let csvSourceName = csvFile.value?.name || ''
    let csvSourceSize = csvFile.value?.size || 0

    if (csvEntries.length) {
      csvSource = await csvEntries[0].async('text')
      csvSourceName = csvEntries[0].name
      csvSourceSize = csvSource.length
      needsSeparateCsv.value = false
    } else if (!csvSource) {
      needsSeparateCsv.value = true
      throw new Error('这个 ZIP 内没有找到 CSV，请在下方补选数据 CSV')
    }

    const { data, fields } = await parseCsv(csvSource)

    if (!fields.includes('编号')) throw new Error('CSV 中没有找到“编号”字段')
    if (!data.length) throw new Error('CSV 中没有可用记录')

    const numberedRows = data.filter((row) => normalizeText(row['编号']))
    const duplicateFilteredCount = numberedRows.filter(isOldDuplicateRow).length
    const builtRecords = numberedRows
      .filter((row) => !isOldDuplicateRow(row))
      .map(buildRecord)
    if (!builtRecords.length) {
      throw new Error('过滤重复旧记录后没有可审核记录')
    }

    const ids = builtRecords.map((record) => record.id)
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
    if (duplicateIds.length) {
      throw new Error(`CSV 中存在重复编号：${[...new Set(duplicateIds)].join('、')}`)
    }

    const index = buildAttachmentIndex(zip)
    let attachmentCount = 0
    let multiImageFields = 0
    let missingFields = 0

    builtRecords.forEach((record) => {
      ATTACHMENT_FIELDS.forEach((field) => {
        const entries = index.get(field)?.get(record.id) || []
        const csvHasAttachment = Boolean(normalizeText(record.row[field]))
        attachmentCount += entries.length
        if (entries.length > 1) multiImageFields += 1
        if (csvHasAttachment && !entries.length) missingFields += 1
      })
    })

    records.value = builtRecords
    reviewNote.value = builtRecords[0]?.reviewNote || ''
    zipArchive.value = zip
    attachmentIndex.value = index
    validation.value = {
      attachments: attachmentCount,
      missing: missingFields,
      multiple: multiImageFields,
    }
    currentIndex.value = 0
    batchStorageKey.value = [
      'screening-results-v4',
      csvSourceSize,
      zipFile.value.size,
      builtRecords[0]?.id,
      builtRecords.at(-1)?.id,
    ].join(':')
    batchName.value = zipFile.value.name
      .replace(/\.zip$/i, '')
      .replace(/_?附件$/i, '')
      .trim() || '天火卡申请名单'
    autoExported.value = false
    decisions.value = loadSavedDecisions(batchStorageKey.value)
    reviewNote.value = decisions.value[builtRecords[0]?.id]?.note
      ?? builtRecords[0]?.reviewNote
      ?? ''
    importState.value = 'ready'
    importMessage.value = `已从 ${csvSourceName} 载入 ${builtRecords.length} 条记录${
      duplicateFilteredCount ? `，已过滤 ${duplicateFilteredCount} 条重复旧记录` : ''
    }`
    await nextTick()
    await loadCurrentImages()
  } catch (error) {
    importState.value = 'error'
    importMessage.value = error?.message || '导入失败，请检查文件'
  }
}

function handleCsvChange(event) {
  csvFile.value = event.target.files?.[0] || null
  if (csvFile.value && zipFile.value) importBatch()
}

function handleZipChange(event) {
  zipFile.value = event.target.files?.[0] || null
  csvFile.value = null
  needsSeparateCsv.value = false
  if (zipFile.value) importBatch()
}

async function showRecord(index) {
  if (index < 0 || index >= records.value.length) return
  currentIndex.value = index
  lightboxImage.value = null
  revealResult.value = null
  currentImages.value = new Map()
  reviewNote.value = decisions.value[current.value.id]?.note ?? current.value.reviewNote ?? ''
  validation.value = current.value.remote
    ? summarizeRemoteValidation(current.value)
    : validation.value
  if (current.value.remote) {
    if (currentIndex.value === records.value.length - 1) {
      startNextRecordPrefetch(current.value)
    } else {
      cancelNextPrefetch()
    }
  }
  document.querySelector('.screening-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  await loadCurrentImages()
}

function goNext() {
  if (
    current.value?.remote
    && currentIndex.value === records.value.length - 1
  ) {
    openNextUnreviewed(current.value.id)
    return
  }
  showRecord(Math.min(currentIndex.value + 1, records.value.length - 1))
}

function goPrevious() {
  showRecord(Math.max(currentIndex.value - 1, 0))
}

async function saveDecision(decision) {
  if (!current.value || decisionSyncState.value === 'saving') return

  const decisionStartedAt = Date.now()
  const now = new Date()
  const record = current.value
  const note = normalizeText(reviewNote.value).slice(0, 500)

  if (record.remote) {
    decisionSyncState.value = 'saving'
    decisionSyncMessage.value = `正在保存“${decision}”，成功后自动进入下一位…`
    revealResult.value = decision
    try {
      const data = await feishuRequest('/api/feishu/review', {
        recordId: record.recordId,
        result: decision,
        note,
      })
      now.setTime(Number(data.review_time) || Date.now())
      feishuSearchCache.clear()
      decisionSyncState.value = 'success'
      decisionSyncMessage.value = `已同步到飞书：${decision} · ${now.toLocaleString('zh-CN', { hour12: false })}`
    } catch (error) {
      decisionSyncState.value = 'error'
      decisionSyncMessage.value = error?.message || '审核结果同步失败，请重试'
      revealResult.value = null
      return
    }
  }

  const updatedDecisions = {
    ...decisions.value,
    [record.id]: {
      result: decision,
      time: now.toLocaleString('zh-CN', { hour12: false }),
      note,
    },
  }
  decisions.value = updatedDecisions
  persistDecisions()
  revealResult.value = decision

  const batchComplete = !record.remote
    && records.value.length > 0
    && Object.keys(updatedDecisions).length === records.value.length

  if (batchComplete && !autoExported.value) {
    autoExported.value = true
    exportResults(updatedDecisions)
  }

  window.clearTimeout(decisionTimer)
  const revealDelay = record.remote
    ? Math.max(120, 900 - (Date.now() - decisionStartedAt))
    : 1150
  decisionTimer = window.setTimeout(() => {
    if (record.remote) {
      if (currentIndex.value < records.value.length - 1) {
        showRecord(currentIndex.value + 1)
      } else {
        openNextUnreviewed(record.id)
      }
    } else if (currentIndex.value < records.value.length - 1) {
      showRecord(currentIndex.value + 1)
    } else {
      revealResult.value = null
    }
  }, revealDelay)
}

function csvEscape(value) {
  const text = String(value ?? '')
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function firstCharacter(value) {
  return Array.from(String(value || ''))[0] || '鲲'
}

function formatExportTimestamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function exportResults(decisionSource = decisions.value) {
  const rows = records.value
    .filter((record) => decisionSource[record.id])
    .map((record) => [
      record.id,
      record.wechatPhone,
      record.nickname,
      decisionSource[record.id].result,
      decisionSource[record.id].time,
      decisionSource[record.id].note || '',
    ])

  if (!rows.length) return

  const csv = [
    ['编号', '微信注册手机号', '昵称', '直播筛选结果', '直播筛选时间', '直播筛选备注'],
    ...rows,
  ].map((row) => row.map(csvEscape).join(',')).join('\r\n')

  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  const safeBatchName = batchName.value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
  link.download = `${safeBatchName}_直播筛选结果_${rows.length}人_${formatExportTimestamp()}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function resetBatch() {
  window.clearTimeout(decisionTimer)
  imageLoadToken += 1
  cancelNextPrefetch()
  revokeObjectUrls()
  records.value = []
  csvFile.value = null
  zipFile.value = null
  needsSeparateCsv.value = false
  zipArchive.value = null
  attachmentIndex.value = new Map()
  currentImages.value = new Map()
  currentIndex.value = 0
  importState.value = 'idle'
  importMessage.value = ''
  batchName.value = '天火卡申请名单'
  autoExported.value = false
  lightboxImage.value = null
  revealResult.value = null
  reviewNote.value = ''
  decisionSyncState.value = 'idle'
  decisionSyncMessage.value = ''
  if (bundleInput.value) bundleInput.value.value = ''
  if (csvInput.value) csvInput.value.value = ''
}

function openEvidence(image) {
  lightboxImage.value = lightboxImage.value?.src === image.src ? null : image
}

onBeforeUnmount(() => {
  window.clearTimeout(decisionTimer)
  cancelNextPrefetch()
  revokeObjectUrls()
})
</script>

<template>
  <main class="screening-page">
    <div class="screening-ambient" aria-hidden="true"></div>

    <section v-if="!current" class="import-shell">
      <div class="import-mark" aria-hidden="true">鲲</div>
      <p class="eyebrow">TIANHUO LIVE SCREENING</p>
      <h1>选择审核数据</h1>
      <p class="import-intro">
        可通过飞书机器人查找真实记录并同步审核结果，也可继续导入本地 ZIP 审核。
      </p>

      <div class="source-mode-switch" role="tablist" aria-label="审核数据来源">
        <button
          type="button"
          role="tab"
          :aria-selected="sourceMode === 'feishu'"
          :class="{ active: sourceMode === 'feishu' }"
          @click="sourceMode = 'feishu'"
        >
          飞书机器人
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="sourceMode === 'local'"
          :class="{ active: sourceMode === 'local' }"
          @click="sourceMode = 'local'"
        >
          本地 ZIP
        </button>
      </div>

      <div v-if="sourceMode === 'feishu'" class="feishu-connect-panel">
        <div v-if="!isPublicDeployment" class="credential-grid">
          <label>
            <span>App ID</span>
            <input
              v-model.trim="feishuAppId"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="cli_xxxxxxxxxxxxxxxx"
            >
          </label>
          <label>
            <span>App Secret</span>
            <input
              v-model="feishuAppSecret"
              type="password"
              autocomplete="new-password"
              spellcheck="false"
              placeholder="只在当前页面使用"
            >
          </label>
        </div>

        <p v-if="!isPublicDeployment" class="credential-note">
          凭据仅保留在当前打开的页面内；搜索范围为公开问卷全表，不受飞书视图筛选限制。
        </p>
        <p v-else class="credential-note server-credential-note">
          已启用 Vercel 安全凭据模式；App Secret 仅从服务端环境变量读取，不会进入浏览器。
        </p>

        <label v-if="isPublicDeployment" class="public-access-field">
          <span>审核访问口令</span>
          <input
            v-model="publicAccessKey"
            type="password"
            autocomplete="current-password"
            placeholder="输入 Vercel 中设置的 SCREENING_ACCESS_KEY"
          >
        </label>

        <form class="feishu-search-bar" @submit.prevent="searchFeishu">
          <input
            v-model.trim="feishuQuery"
            type="search"
            autocomplete="off"
            placeholder="输入编号、微信手机号、微信/抖音昵称或抖音 ID"
          >
          <button type="submit" :disabled="feishuSearchState === 'loading' || feishuSearchState === 'opening'">
            <span v-if="feishuSearchState === 'loading'" class="spinner"></span>
            {{ feishuSearchState === 'loading' ? '搜索中' : '搜索全表' }}
          </button>
          <button
            type="button"
            class="next-unreviewed-button"
            :disabled="feishuSearchState === 'loading' || feishuSearchState === 'opening'"
            @click="openNextUnreviewed()"
          >
            <span v-if="feishuSearchState === 'opening'" class="spinner"></span>
            下一个未审核
          </button>
        </form>

        <p
          v-if="feishuMessage"
          class="import-message"
          :class="feishuSearchState"
        >
          {{ feishuMessage }}
        </p>

        <div v-if="feishuResults.length" class="feishu-result-list">
          <button
            v-for="record in feishuResults"
            :key="record.record_id"
            type="button"
            class="feishu-result-card"
            :disabled="feishuSearchState === 'opening'"
            @click="openFeishuRecord(record)"
          >
            <span class="result-number">#{{ normalizeText(record.fields['编号']) || '未编号' }}</span>
            <span class="result-main">
              <strong>
                {{ normalizeText(record.fields['你的抖音昵称'])
                  || getWechatNickname(record.fields['你的微信号【微信昵称】'])
                  || '未填写昵称' }}
              </strong>
              <small>
                {{ maskPhone(record.fields['你的微信注册手机号']) }}
                · 初筛 {{ normalizeText(record.fields['初筛状态']) || '未标记' }}
              </small>
            </span>
            <span
              class="result-status"
              :class="normalizeText(record.fields['直播筛选结果']) === '通过' ? 'pass' : 'pending'"
            >
              {{ normalizeText(record.fields['直播筛选结果']) || '未直播审核' }}
            </span>
          </button>
        </div>
      </div>

      <div v-else class="local-import-panel">
        <div class="import-grid single">
          <label class="file-card primary" :class="{ selected: zipFile }">
            <input
              ref="bundleInput"
              type="file"
              accept=".zip,application/zip"
              @change="handleZipChange"
            >
            <span class="file-index">01</span>
            <strong>{{ zipFile ? zipFile.name : '选择本场资料 ZIP' }}</strong>
            <small>{{ zipFile ? '正在读取压缩包内容' : '内含一份 CSV 和对应附件文件夹' }}</small>
          </label>

          <label v-if="needsSeparateCsv" class="file-card fallback" :class="{ selected: csvFile }">
            <input
              ref="csvInput"
              type="file"
              accept=".csv,text/csv"
              @change="handleCsvChange"
            >
            <span class="file-index">02</span>
            <strong>{{ csvFile ? csvFile.name : '补选数据 CSV' }}</strong>
            <small>{{ csvFile ? '数据文件已选择' : '仅用于兼容旧版附件压缩包' }}</small>
          </label>
        </div>

        <button
          class="import-action"
          type="button"
          :disabled="!zipFile || (needsSeparateCsv && !csvFile) || importState === 'loading'"
          @click="importBatch"
        >
          <span v-if="importState === 'loading'" class="spinner"></span>
          {{ importState === 'loading' ? '正在载入真实资料…' : '载入本场名单' }}
        </button>

        <p v-if="importMessage" class="import-message" :class="importState">
          {{ importMessage }}
        </p>
      </div>
    </section>

    <template v-else>
      <aside class="batch-panel">
        <div class="batch-progress">
          <span>本场进度</span>
          <strong>{{ reviewedCount }}<small>/{{ records.length }}</small></strong>
        </div>
        <div class="progress-track">
          <i :style="{ width: `${progressPercent}%` }"></i>
        </div>
        <div class="batch-actions">
          <template v-if="current.remote">
            <button type="button" class="quiet" @click="resetBatch">返回搜索</button>
          </template>
          <template v-else>
            <button type="button" :disabled="!reviewedCount" @click="exportResults()">导出结果</button>
            <button type="button" class="quiet" @click="resetBatch">更换批次</button>
          </template>
        </div>
      </aside>

      <div class="screening-content">
        <div class="vertical-shell">
          <section class="applicant-hero">
            <div class="applicant-number">
              <span>APPLICATION</span>
              <strong>{{ current.id }}</strong>
            </div>

            <div class="applicant-main">
              <div class="candidate-avatar">{{ firstCharacter(current.nickname) }}</div>
              <div>
                <span class="precheck-badge">
                  {{ current.remote ? '飞书实时记录 · 审核结果可同步' : '已通过初筛 · 本地只读审核' }}
                  <template v-if="current.remote && nextPrefetchLabel">
                    · {{ nextPrefetchLabel }}
                  </template>
                </span>
                <h1><small>抖音昵称</small>{{ current.nickname }}</h1>
                <p>
                  编号 {{ current.id }} · 提交于 {{ current.submittedAt }}
                  <template v-if="current.wechatNickname">
                    · 微信昵称 {{ current.wechatNickname }}
                  </template>
                </p>
              </div>
            </div>

            <div class="vertical-record-switcher">
              <button
                type="button"
                :disabled="currentIndex === 0 || decisionSyncState === 'saving' || feishuSearchState === 'opening'"
                @click="goPrevious"
              >
                <span>←</span> 上一位
              </button>
              <strong>{{ currentIndex + 1 }} / {{ records.length }}</strong>
              <button
                type="button"
                :disabled="
                  decisionSyncState === 'saving'
                    || feishuSearchState === 'opening'
                    || (!current.remote && currentIndex === records.length - 1)
                "
                @click="goNext"
              >
                下一位 <span>→</span>
              </button>
            </div>
          </section>

          <section class="privacy-strip">
            <span>隐私保护</span>
            昵称可展示；手机号、账号 ID、MAC、ICCID 等敏感信息已自动隐藏
            <em>
              已匹配 {{ validation.attachments }} 张附件
              <template v-if="validation.multiple"> · {{ validation.multiple }} 处多图</template>
              <template v-if="validation.missing"> · {{ validation.missing }} 处附件待核对</template>
            </em>
          </section>

          <section
            v-for="(group, groupIndex) in current.groups"
            :key="group.id"
            class="question-section"
          >
            <header class="section-heading">
              <span>{{ String(groupIndex + 1).padStart(2, '0') }}</span>
              <div>
                <small>FORM RESPONSES</small>
                <h2>{{ group.label }}</h2>
              </div>
            </header>

            <div v-if="compactQuestions(group).length" class="compact-question-grid">
              <article
                v-for="question in compactQuestions(group)"
                :key="question.number"
                class="compact-question"
                :class="{ empty: question.answer === '未填写' }"
              >
                <div class="question-number">Q{{ String(question.number).padStart(2, '0') }}</div>
                <div>
                  <p>{{ question.shortLabel }}</p>
                  <strong :class="answerTone(question.answer)">{{ question.answer }}</strong>
                </div>
              </article>
            </div>

            <article
              v-if="group.id === 'device'"
              class="traffic-card-detail"
              :class="{ empty: !current.trafficCard.hasContent }"
            >
              <header>
                <span>Q12</span>
                <div>
                  <small>TRAFFIC CARD</small>
                  <h3>流量卡累计充值金额与 ICCID</h3>
                </div>
                <em :class="{ warning: !current.trafficCard.normalizedIccid }">
                  {{ current.trafficCard.normalizedIccid ? 'ICCID 已标准化' : 'ICCID 未识别' }}
                </em>
              </header>

              <div class="traffic-card-grid">
                <div class="traffic-submission">
                  <span>申请人填写内容</span>
                  <p>{{ current.trafficCard.submission }}</p>
                </div>
                <div class="masked-iccid">
                  <span>标准化 ICCID · 隐私打码</span>
                  <strong>{{ current.trafficCard.maskedIccid }}</strong>
                  <small>直播画面仅显示首 4 位与末 4 位</small>
                </div>
              </div>
            </article>

            <div v-if="detailQuestions(group).length" class="detail-question-list">
              <article
                v-for="question in detailQuestions(group)"
                :key="question.number"
                class="detail-question"
                :class="{ long: question.long, empty: question.answer === '未填写' }"
              >
                <header>
                  <span>Q{{ String(question.number).padStart(2, '0') }}</span>
                  <p>{{ question.question }}</p>
                </header>
                <div class="detail-answer" :class="answerTone(question.answer)">
                  {{ question.answer }}
                </div>
                <div v-if="question.detail" class="detail-subanswer">
                  <span>{{ question.detailLabel }}</span>
                  {{ question.detail }}
                </div>
              </article>
            </div>

            <div v-if="linkedQuestions(group).length" class="linked-question-list">
              <article
                v-for="question in linkedQuestions(group)"
                :key="`linked-${question.number}`"
                class="linked-question-block"
              >
                <div
                  class="linked-response"
                  :class="{ empty: question.answer === '未填写' }"
                >
                  <span class="question-number">
                    Q{{ String(question.number).padStart(2, '0') }}
                  </span>
                  <div>
                    <p>{{ question.question }}</p>
                    <strong :class="answerTone(question.answer)">{{ question.answer }}</strong>
                  </div>
                </div>

                <template v-if="shouldShowEvidence(question.answer)">
                  <header class="linked-evidence-heading">
                    <span>Q{{ String(question.evidence.number).padStart(2, '0') }}</span>
                    <div>
                      <small>ORIGINAL IMAGE</small>
                      <h3>{{ question.evidence.question }}</h3>
                    </div>
                    <em v-if="questionExpectedImageCount(question)">
                      {{ questionImages(question).length }}
                      / {{ questionExpectedImageCount(question) }} 张原图
                    </em>
                  </header>

                  <div v-if="questionImages(question).length" class="evidence-images">
                    <figure
                      v-for="(image, imageIndex) in questionImages(question)"
                      :key="image.src"
                      @click="openEvidence(image)"
                    >
                      <img :src="image.src" :alt="`${question.evidence.question} ${imageIndex + 1}`">
                      <figcaption>
                        <span>原图 {{ imageIndex + 1 }} / {{ questionImages(question).length }}</span>
                        <small>点击放大，再次点击关闭</small>
                      </figcaption>
                    </figure>
                  </div>

                  <div v-if="questionImagesLoading(question)" class="image-loading">
                    <span class="spinner"></span>
                    正在按题目顺序读取原图
                  </div>

                  <div
                    v-else-if="!questionImages(question).length"
                    class="no-evidence"
                  >
                    本题未提供附件
                  </div>
                </template>
              </article>
            </div>
          </section>
        </div>
      </div>

      <label class="review-note-panel">
        <span>
          <strong>直播筛选备注</strong>
          <small>通过与不通过均会提交</small>
        </span>
        <textarea
          v-model="reviewNote"
          maxlength="500"
          :disabled="decisionSyncState === 'saving'"
          placeholder="填写本次审核说明（可选）"
        ></textarea>
        <em>{{ reviewNote.length }} / 500</em>
      </label>

      <div
        v-if="decisionSyncMessage"
        class="decision-sync-status"
        :class="decisionSyncState"
        role="status"
      >
        <span v-if="decisionSyncState === 'saving'" class="spinner"></span>
        {{ decisionSyncMessage }}
      </div>

      <button
        type="button"
        class="decision-button decision-reject"
        :class="{ selected: currentDecision?.result === '不通过' }"
        :disabled="decisionSyncState === 'saving'"
        @click="saveDecision('不通过')"
      >
        <span>×</span>
        <strong>不通过</strong>
      </button>

      <button
        type="button"
        class="decision-button decision-approve"
        :class="{ selected: currentDecision?.result === '通过' }"
        :disabled="decisionSyncState === 'saving'"
        @click="saveDecision('通过')"
      >
        <span>✓</span>
        <strong>通过</strong>
      </button>

      <div
        v-if="revealResult"
        class="decision-reveal"
        :class="revealResult === '通过' ? 'approve' : 'reject'"
        role="status"
        aria-live="assertive"
      >
        <i class="decision-ring" aria-hidden="true"></i>
        <span class="decision-symbol">{{ revealResult === '通过' ? '✓' : '×' }}</span>
        <strong>{{ revealResult }}</strong>
        <small>
          {{
            current.remote
              ? decisionSyncState === 'saving'
                ? '正在同步飞书，请勿关闭页面'
                : '结果已同步到飞书'
              : reviewedCount === records.length
                ? '全部完成 · 结果已自动导出'
                : '结果已保存到本机'
          }}
        </small>
      </div>
    </template>

    <div
      v-if="lightboxImage"
      class="evidence-lightbox"
      role="button"
      tabindex="0"
      aria-label="关闭原图"
      @click="openEvidence(lightboxImage)"
      @keydown.enter="openEvidence(lightboxImage)"
    >
      <img :src="lightboxImage.src" :alt="lightboxImage.label">
      <div>
        <strong>{{ lightboxImage.label }}</strong>
        <span>再次点击关闭原图</span>
      </div>
    </div>
  </main>
</template>
