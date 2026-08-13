<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import './artisan-screening.css'

const ATTACHMENT_FIELDS = [
  { name: '公开账号主页截屏', label: '公开账号主页截屏', hint: '用于核对公开账号与申请人身份' },
  { name: '上传你的工作台照片', label: '工作台照片', hint: '用于判断工具、环境与实际动手条件' },
  { name: '上传或展示你的过往作品', label: '过往作品', hint: '用于判断动手经验与作品完成度' },
]

const accessKey = ref('')
const rememberPassword = ref(false)
const passwordOpen = ref(true)
const query = ref('')
const results = ref([])
const current = ref(null)
const stats = ref({ total: 0, pending: 0, passed: 0, rejected: 0 })
const pageState = ref('idle')
const reviewState = ref('idle')
const message = ref('')
const reviewMessage = ref('')
const reviewNote = ref('')
const navigationMessage = ref('')
const nextCacheState = ref('idle')
const images = ref(new Map())
const imageState = ref('idle')
const imageMessage = ref('')
const lightboxImage = ref(null)
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const PASSWORD_STORAGE_KEY = 'manghe-artisan-screening-access-key'
const RECORD_CACHE_TTL_MS = 4 * 60 * 1000
const recordBundleCache = new Map()
const mediaBundleCache = new Map()
let requestVersion = 0
let prefetchVersion = 0
let pendingNextPrefetch = null

function normalize(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(normalize).filter(Boolean).join('、')
  if (typeof value === 'object') {
    return normalize(
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

function listValue(value) {
  if (Array.isArray(value)) return value.map(normalize).filter(Boolean)
  const text = normalize(value)
  return text ? [text] : []
}

function field(name) {
  return current.value?.fields?.[name]
}

function fieldText(name, fallback = '未填写') {
  return normalize(field(name)) || fallback
}

function listField(name) {
  return listValue(field(name))
}

function maskPhone(value) {
  const phone = normalize(value).replace(/\D/g, '')
  if (!/^1[3-9]\d{9}$/.test(phone)) return '号码格式未识别'
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`
}

function formatTime(value) {
  if (!value) return '时间未知'
  const number = Number(value)
  const date = Number.isFinite(number)
    ? new Date(number < 10_000_000_000 ? number * 1000 : number)
    : new Date(value)
  if (Number.isNaN(date.getTime())) return normalize(value)
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
}

function attachmentList(value, fieldName) {
  const source = Array.isArray(value) ? value : value ? [value] : []
  return source.map((item) => ({
    fieldName,
    fileToken: normalize(item?.file_token ?? item?.fileToken ?? item?.token),
    filename: normalize(item?.name ?? item?.file_name) || '飞书图片',
    size: Number(item?.size) || 0,
    tmpUrl: normalize(item?.tmp_url ?? item?.tmpUrl),
  })).filter((item) => item.fileToken)
}

function mediaKind(filename) {
  const name = normalize(filename)
  if (/\.(?:mp4|mov|webm|m4v)$/i.test(name)) return 'video'
  if (/\.(?:heic|heif)$/i.test(name)) return 'heic'
  if (/\.(?:jpe?g|png|webp|gif|bmp|avif)$/i.test(name)) return 'image'
  return 'file'
}

function mediaLabel(image) {
  return {
    video: '视频',
    heic: 'HEIC 原图',
    image: '图片',
    file: '附件',
  }[mediaKind(image?.filename)]
}

function attachmentSizeText(image) {
  const size = Number(image?.size)
  if (!Number.isFinite(size) || size <= 0) return ''
  if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function markPreviewFailed(image) {
  image.previewFailed = true
}

const number = computed(() => fieldText('编号', '—'))
const displayName = computed(() => (
  fieldText('微信昵称', '')
  || fieldText('抖音昵称', '')
  || `申请人 ${number.value}`
))
const submitTime = computed(() => formatTime(field('提交时间') || current.value?.created_time))
const reviewResult = computed(() => fieldText('直播审核结果', '待审核'))
const progress = computed(() => stats.value.total
  ? Math.round(((stats.value.passed + stats.value.rejected) / stats.value.total) * 100)
  : 0)
const attachmentCount = computed(() => ATTACHMENT_FIELDS.reduce(
  (total, item) => total + attachmentList(field(item.name), item.name).length,
  0,
))

function otherDetail(mainField, detailField) {
  const main = listField(mainField)
  const detail = fieldText(detailField, '')
  return main.includes('其他') && detail ? detail : ''
}

async function api(path, payload = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 20_000)
  try {
    const response = await fetch(path, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: isLocal ? import.meta.env.VITE_FEISHU_APP_ID : '',
        appSecret: isLocal ? import.meta.env.VITE_FEISHU_APP_SECRET : '',
        accessKey: accessKey.value,
        ...payload,
      }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '连接飞书审核服务失败')
    return data
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('请求超时，请检查网络后重试')
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}

function validateAccess() {
  if (isLocal) return true
  if (accessKey.value) return true
  message.value = '请先输入审核访问口令'
  passwordOpen.value = true
  return false
}

function persistAccessKey() {
  if (rememberPassword.value && accessKey.value) {
    localStorage.setItem(PASSWORD_STORAGE_KEY, accessKey.value)
  } else {
    localStorage.removeItem(PASSWORD_STORAGE_KEY)
  }
}

async function fetchImageBundle(record) {
  const attachments = ATTACHMENT_FIELDS.flatMap((item) => (
    attachmentList(record.fields?.[item.name], item.name)
  ))
  if (!attachments.length) {
    return { images: new Map(), imageState: 'ready', imageMessage: '' }
  }

  try {
    const data = await api('/api/artisan/attachment-urls', {
      recordId: record.record_id,
      attachments,
    })
    const next = new Map()
    let failures = 0
    let rateLimited = 0
    let retryAfter = 0
    for (const item of data.images || []) {
      if (!next.has(item.fieldName)) next.set(item.fieldName, [])
      next.get(item.fieldName).push(item)
      if (item.error || !item.url) failures += 1
      if (item.rateLimited) rateLimited += 1
      retryAfter = Math.max(retryAfter, Number(item.retryAfter) || 0)
    }
    return {
      images: next,
      imageState: 'ready',
      imageMessage: failures
        ? rateLimited
          ? `飞书附件服务请求频繁，仍有 ${failures} 个附件未加载，${retryAfter ? `请约 ${retryAfter} 秒后` : '请稍后'}重新加载`
          : `${failures} 个附件暂时无法加载，可点击重新加载附件`
        : '',
    }
  } catch (error) {
    return {
      images: new Map(),
      imageState: 'error',
      imageMessage: error?.message || '飞书附件直链获取失败',
    }
  }
}

async function reloadImages() {
  if (!current.value || imageState.value === 'loading') return
  const recordId = current.value.record_id
  mediaBundleCache.delete(recordId)
  imageState.value = 'loading'
  imageMessage.value = '正在重新获取飞书附件直链…'
  const media = await fetchMediaCached(current.value)
  if (current.value?.record_id !== recordId) return
  images.value = new Map(media.images)
  imageState.value = media.imageState
  imageMessage.value = media.imageMessage
}

function trimRecordCache() {
  while (recordBundleCache.size > 5) {
    const oldestKey = recordBundleCache.keys().next().value
    recordBundleCache.delete(oldestKey)
  }
}

function trimMediaCache() {
  while (mediaBundleCache.size > 3) {
    const oldestKey = mediaBundleCache.keys().next().value
    mediaBundleCache.delete(oldestKey)
  }
}

async function fetchRecordBundle(summary) {
  const recordId = summary?.record_id
  if (!recordId) throw new Error('申请记录编号缺失')

  const cached = recordBundleCache.get(recordId)
  if (cached && cached.expiresAt > Date.now()) return cached.promise
  if (cached) recordBundleCache.delete(recordId)

  const promise = (async () => {
    const data = await api('/api/artisan/record', { recordId })
    return { record: data.record }
  })()
  recordBundleCache.set(recordId, {
    expiresAt: Date.now() + RECORD_CACHE_TTL_MS,
    promise,
  })
  trimRecordCache()

  try {
    return await promise
  } catch (error) {
    if (recordBundleCache.get(recordId)?.promise === promise) recordBundleCache.delete(recordId)
    throw error
  }
}

async function fetchMediaCached(record) {
  const recordId = record?.record_id
  if (!recordId) return { images: new Map(), imageState: 'ready', imageMessage: '' }
  const cached = mediaBundleCache.get(recordId)
  if (cached && cached.expiresAt > Date.now()) return cached.promise
  if (cached) mediaBundleCache.delete(recordId)

  const promise = fetchImageBundle(record)
  mediaBundleCache.set(recordId, {
    expiresAt: Date.now() + RECORD_CACHE_TTL_MS,
    promise,
  })
  trimMediaCache()
  return promise
}

async function requestQueueRecord(afterNumber = '', direction = 'next', includeReviewed = false) {
  return api('/api/artisan/next', {
    afterNumber,
    direction,
    includeReviewed,
    includeRecord: true,
  })
}

function loadMediaInBackground(record, version) {
  const recordId = record?.record_id
  if (!recordId) return
  imageState.value = 'loading'
  imageMessage.value = ''
  images.value = new Map()
  fetchMediaCached(record).then((media) => {
    if (version !== requestVersion || current.value?.record_id !== recordId) return
    images.value = new Map(media.images)
    imageState.value = media.imageState
    imageMessage.value = media.imageMessage
  }).catch((error) => {
    if (version !== requestVersion || current.value?.record_id !== recordId) return
    imageState.value = 'error'
    imageMessage.value = error?.message || '飞书附件直链获取失败'
  })
}

function warmNextRecords(record) {
  const afterNumber = normalize(record?.fields?.['编号'])
  if (!afterNumber) return
  const version = ++prefetchVersion
  nextCacheState.value = 'loading'

  pendingNextPrefetch = {
    afterNumber,
    promise: requestQueueRecord(afterNumber, 'next', false),
  }

  pendingNextPrefetch.promise.then((data) => {
    if (version !== prefetchVersion) return
    nextCacheState.value = data.record ? 'ready' : 'empty'
  }).catch(() => {
    if (version === prefetchVersion) nextCacheState.value = 'error'
  })
}

function activateRecord(record, version) {
  current.value = record
  reviewNote.value = normalize(record.fields?.['直播审核备注'])
  results.value = []
  pageState.value = 'ready'
  message.value = ''
  navigationMessage.value = ''
  reviewState.value = 'idle'
  reviewMessage.value = ''
  passwordOpen.value = false
  persistAccessKey()
  window.scrollTo({ top: 0, behavior: 'auto' })
  loadMediaInBackground(record, version)
  warmNextRecords(record)
}

async function openRecord(summary, preparedRecord = null) {
  if (!summary?.record_id) return
  const version = ++requestVersion
  pageState.value = 'loading'
  message.value = '正在读取完整申请资料…'
  lightboxImage.value = null
  try {
    const record = preparedRecord || (await fetchRecordBundle(summary)).record
    if (version !== requestVersion) return
    activateRecord(record, version)
  } catch (error) {
    if (version !== requestVersion) return
    pageState.value = 'error'
    message.value = error?.message || '申请资料读取失败'
  }
}

async function openNext(afterNumber = '') {
  if (!validateAccess() || pageState.value === 'loading') return
  pageState.value = 'loading'
  message.value = current.value ? '正在打开下一位待审核申请人…' : '正在查找待审核申请人…'
  try {
    const usedCached = pendingNextPrefetch?.afterNumber === normalize(afterNumber)
    const cached = usedCached
      ? pendingNextPrefetch.promise
      : null
    const data = await (cached || requestQueueRecord(afterNumber, 'next', false))
    if (!usedCached) stats.value = data.stats || stats.value
    if (!data.record) {
      pageState.value = 'ready'
      message.value = '当前没有待审核记录'
      if (!current.value) passwordOpen.value = false
      persistAccessKey()
      return
    }
    await openRecord(data.record, data.fullRecord)
  } catch (error) {
    pageState.value = 'error'
    message.value = error?.message || '待审核队列读取失败'
  }
}

async function openAdjacent(direction) {
  if (!current.value || !validateAccess() || pageState.value === 'loading') return
  const afterNumber = number.value
  pageState.value = 'loading'
  navigationMessage.value = direction === 'previous' ? '正在打开上一位…' : '正在打开下一位…'
  try {
    const usedCached = direction === 'next' && pendingNextPrefetch?.afterNumber === afterNumber
    const cached = usedCached
      ? pendingNextPrefetch.promise
      : null
    const data = await (cached || requestQueueRecord(afterNumber, direction, true))
    if (!usedCached) stats.value = data.stats || stats.value
    if (!data.record) {
      pageState.value = 'ready'
      navigationMessage.value = direction === 'previous' ? '已经是第一位' : '已经是最后一位'
      return
    }
    await openRecord(data.record, data.fullRecord)
  } catch (error) {
    pageState.value = 'error'
    navigationMessage.value = error?.message || '切换申请人失败'
  }
}

async function search() {
  if (!validateAccess() || pageState.value === 'loading') return
  if (!query.value.trim()) {
    message.value = '请输入手机号或抖音昵称'
    return
  }
  pageState.value = 'loading'
  message.value = '正在搜索申请记录…'
  results.value = []
  try {
    const data = await api('/api/artisan/search', { query: query.value })
    results.value = data.records || []
    pageState.value = 'ready'
    message.value = results.value.length
      ? `找到 ${results.value.length} 条匹配记录`
      : '没有找到匹配记录，请换关键词重试'
    persistAccessKey()
  } catch (error) {
    pageState.value = 'error'
    message.value = error?.message || '搜索失败'
  }
}

async function saveReview(result) {
  if (!current.value || reviewState.value === 'saving') return
  reviewState.value = 'saving'
  reviewMessage.value = `正在保存“${result}”…`
  try {
    const previousResult = reviewResult.value
    await api('/api/artisan/review', {
      recordId: current.value.record_id,
      result,
      note: reviewNote.value,
    })
    current.value.fields['直播审核结果'] = [result]
    current.value.fields['直播审核备注'] = reviewNote.value.trim()
    recordBundleCache.delete(current.value.record_id)
    if (previousResult === '通过') stats.value.passed = Math.max(0, stats.value.passed - 1)
    if (previousResult === '不通过') stats.value.rejected = Math.max(0, stats.value.rejected - 1)
    if (result === '通过') stats.value.passed += 1
    if (result === '不通过') stats.value.rejected += 1
    if (!['通过', '不通过'].includes(previousResult)) {
      stats.value.pending = Math.max(0, stats.value.pending - 1)
    }
    reviewState.value = 'saved'
    reviewMessage.value = `已保存为“${result}”，正在进入下一位…`
    window.setTimeout(() => openNext(number.value), 480)
  } catch (error) {
    reviewState.value = 'error'
    reviewMessage.value = error?.message || '审核结果保存失败'
  }
}

function imageItems(fieldName) {
  return images.value.get(fieldName) || []
}

function openLightbox(image) {
  if (!image?.url) return
  lightboxImage.value = lightboxImage.value?.url === image.url ? null : image
}

function handleKeydown(event) {
  if (!current.value || lightboxImage.value || ['INPUT', 'TEXTAREA'].includes(event.target?.tagName)) return
  if (event.key === '1') saveReview('通过')
  if (event.key === '2') saveReview('不通过')
  if (event.key === 'ArrowLeft') openAdjacent('previous')
  if (event.key === 'ArrowRight') openAdjacent('next')
}

onMounted(() => {
  const saved = localStorage.getItem(PASSWORD_STORAGE_KEY) || ''
  if (saved) {
    accessKey.value = saved
    rememberPassword.value = true
  }
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  requestVersion += 1
  prefetchVersion += 1
  recordBundleCache.clear()
  mediaBundleCache.clear()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <main class="artisan-page">
    <header class="artisan-topbar">
      <a class="artisan-brand" href="/" aria-label="返回项目入口">
        <span>KP</span>
        <div><strong>鲲鹏匠人审核</strong></div>
      </a>
      <div class="artisan-progress" aria-label="审核进度">
        <div><span :style="{ width: `${progress}%` }"></span></div>
        <small>待审核 {{ stats.pending }} · 已完成 {{ stats.passed + stats.rejected }}</small>
      </div>
      <button type="button" class="topbar-key" @click="passwordOpen = !passwordOpen">
        {{ accessKey ? '口令已设置' : '设置审核口令' }}
      </button>
    </header>

    <section v-if="passwordOpen || !current" class="artisan-entry">
      <h1>把真正有手艺的人，<br>一位位认真看完。</h1>

      <div class="entry-card">
        <label v-if="!isLocal" class="password-field">
          <span>审核访问口令</span>
          <input v-model="accessKey" type="password" autocomplete="current-password" placeholder="请输入审核访问口令">
        </label>
        <label v-if="!isLocal" class="remember-field">
          <input v-model="rememberPassword" type="checkbox">
          <span>在当前浏览器记住口令</span>
        </label>
        <button class="primary-entry" type="button" :disabled="pageState === 'loading'" @click="openNext()">
          {{ pageState === 'loading' ? '正在连接飞书…' : '打开下一位待审核申请人' }}
        </button>

        <div class="entry-divider"><span>或按手机号 / 抖音昵称查询</span></div>
        <form class="artisan-search" @submit.prevent="search">
          <input v-model.trim="query" type="password" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="手机号或抖音昵称（输入内容已隐藏）" placeholder="手机号 / 抖音昵称（输入内容会隐藏）">
          <button type="submit" :disabled="pageState === 'loading'">搜索</button>
        </form>
        <p v-if="message" class="entry-message" :class="pageState">{{ message }}</p>
          <div v-if="results.length" class="search-results">
          <button v-for="record in results" :key="record.record_id" type="button" @click="openRecord(record)">
            <span>#{{ normalize(record.fields['编号']) || '—' }}</span>
            <strong>{{ normalize(record.fields['抖音昵称']) || '未填写抖音昵称' }}</strong>
            <small>{{ maskPhone(record.fields['联系电话【微信联系】']) }}</small>
            <em>{{ normalize(record.fields['直播审核结果']) || '待审核' }}</em>
          </button>
          </div>
        </div>
        <div v-if="pageState === 'loading' && !current" class="entry-loading" role="status" aria-live="polite">
          <span></span>
          <div><strong>正在读取申请资料</strong><small>文字内容会先显示，附件随后加载</small></div>
        </div>
      </section>

    <template v-if="current">
      <div class="artisan-document">
        <section class="applicant-hero">
          <div class="hero-number">{{ number }}</div>
          <h1>{{ displayName }}</h1>
          <div class="hero-meta">
            <span>{{ fieldText('所在城市', '城市未填写') }}</span>
            <span>{{ submitTime }}</span>
          </div>
          <div :class="['hero-review-status', reviewResult === '通过' ? 'passed' : reviewResult === '不通过' ? 'rejected' : 'pending']">
            <span>当前直播审核结果</span>
            <strong>{{ reviewResult }}</strong>
            <p v-if="fieldText('直播审核备注', '')">上次备注：{{ fieldText('直播审核备注', '') }}</p>
            <p v-else>暂无审核备注</p>
          </div>
          <nav class="applicant-navigation" aria-label="切换申请人">
            <button type="button" :disabled="pageState === 'loading' || reviewState === 'saving'" @click="openAdjacent('previous')">← 上一位</button>
            <div>
              <strong>申请编号 #{{ number }}</strong>
              <small v-if="nextCacheState === 'ready'">下一位资料与附件已自动缓存</small>
              <small v-else-if="nextCacheState === 'loading'">正在缓存下一位资料…</small>
              <small v-else-if="nextCacheState === 'error'">下一位将在切换时读取</small>
              <small v-else>已到队列末尾</small>
            </div>
            <button type="button" :disabled="pageState === 'loading' || reviewState === 'saving'" @click="openAdjacent('next')">下一位 →</button>
          </nav>
          <p v-if="navigationMessage" class="navigation-message">{{ navigationMessage }}</p>
        </section>

        <section class="document-section">
          <header class="section-heading">
            <span>01</span>
            <div><h2>身份与联系方式</h2></div>
          </header>
          <div class="identity-grid">
            <article><small>抖音昵称</small><strong>{{ fieldText('抖音昵称') }}</strong></article>
            <article><small>微信昵称</small><strong>{{ fieldText('微信昵称') }}</strong></article>
            <article><small>联系电话</small><strong>{{ maskPhone(field('联系电话【微信联系】')) }}</strong></article>
            <article><small>所在城市</small><strong>{{ fieldText('所在城市') }}</strong></article>
          </div>
          <article class="answer-block">
            <small>申请人身份</small>
            <div class="tag-list"><span v-for="item in listField('你的身份是？')" :key="item">{{ item }}</span></div>
            <p v-if="otherDetail('你的身份是？', '你的身份是？-其他-补充内容')" class="answer-detail">
              {{ otherDetail('你的身份是？', '你的身份是？-其他-补充内容') }}
            </p>
          </article>
          <article class="answer-block">
            <small>公开账号</small>
            <p>{{ fieldText('你的公开账号') }}</p>
          </article>
          <section class="evidence-block">
            <header><div><h3>公开账号主页截屏</h3></div><em>{{ attachmentList(field('公开账号主页截屏'), '公开账号主页截屏').length }} 张</em></header>
            <div v-if="imageItems('公开账号主页截屏').length" class="image-grid">
              <article v-for="(image, index) in imageItems('公开账号主页截屏')" :key="image.fileToken" class="media-card">
                <button v-if="image.url && ['image', 'heic'].includes(mediaKind(image.filename)) && !image.previewFailed" type="button" class="media-preview" @click="openLightbox(image)">
                  <img :src="image.url" :alt="`公开账号主页截屏 ${index + 1}`" referrerpolicy="no-referrer" loading="eager" decoding="async" @error="markPreviewFailed(image)">
                </button>
                <video v-else-if="image.url && mediaKind(image.filename) === 'video' && !image.previewFailed" :src="image.url" controls playsinline preload="metadata" referrerpolicy="no-referrer" @error="markPreviewFailed(image)"></video>
                <div v-else class="media-fallback"><strong>{{ mediaLabel(image) }}</strong><span>{{ image.error || '当前浏览器无法在线预览，可打开飞书原文件' }}</span></div>
                <footer>
                  <div><strong>{{ image.filename }}</strong><small>{{ mediaLabel(image) }}<template v-if="attachmentSizeText(image)"> · {{ attachmentSizeText(image) }}</template> · {{ index + 1 }} / {{ imageItems('公开账号主页截屏').length }}</small></div>
                  <a v-if="image.url" :href="image.url" target="_blank" rel="noopener noreferrer">打开原文件 ↗</a>
                </footer>
              </article>
            </div>
            <p v-else class="image-placeholder">{{ imageState === 'loading' ? '正在获取飞书图片直链…' : '未上传公开账号截图' }}</p>
          </section>
        </section>

        <section class="document-section">
          <header class="section-heading">
            <span>02</span>
            <div><h2>动手经历与能力</h2></div>
          </header>
          <article class="long-answer"><small>自我介绍与动手经历</small><p>{{ fieldText('请简单介绍自己和你的动手经历') }}</p></article>
          <article class="answer-block">
            <small>擅长项目</small>
            <div class="tag-list"><span v-for="item in listField('你擅长哪些项目？')" :key="item">{{ item }}</span></div>
            <p v-if="otherDetail('你擅长哪些项目？', '你擅长哪些项目？-其他-补充内容')" class="answer-detail">
              {{ otherDetail('你擅长哪些项目？', '你擅长哪些项目？-其他-补充内容') }}
            </p>
          </article>
          <article class="ability-callout">
            <small>能否独立安装鲲鹏铝合金壳</small>
            <strong>{{ fieldText('你目前能否独立安装鲲鹏铝合金壳？') }}</strong>
          </article>

          <section v-for="item in ATTACHMENT_FIELDS.slice(1)" :key="item.name" class="evidence-block large">
            <header><div><h3>{{ item.label }}</h3></div><em>{{ attachmentList(field(item.name), item.name).length }} 张</em></header>
            <div v-if="imageItems(item.name).length" class="image-grid large">
              <article v-for="(image, index) in imageItems(item.name)" :key="image.fileToken" class="media-card">
                <button v-if="image.url && ['image', 'heic'].includes(mediaKind(image.filename)) && !image.previewFailed" type="button" class="media-preview" @click="openLightbox(image)">
                  <img :src="image.url" :alt="`${item.label} ${index + 1}`" referrerpolicy="no-referrer" loading="lazy" decoding="async" @error="markPreviewFailed(image)">
                </button>
                <video v-else-if="image.url && mediaKind(image.filename) === 'video' && !image.previewFailed" :src="image.url" controls playsinline preload="metadata" referrerpolicy="no-referrer" @error="markPreviewFailed(image)"></video>
                <div v-else class="media-fallback"><strong>{{ mediaLabel(image) }}</strong><span>{{ image.error || '当前浏览器无法在线预览，可打开飞书原文件' }}</span></div>
                <footer>
                  <div><strong>{{ image.filename }}</strong><small>{{ mediaLabel(image) }}<template v-if="attachmentSizeText(image)"> · {{ attachmentSizeText(image) }}</template> · {{ index + 1 }} / {{ imageItems(item.name).length }}</small></div>
                  <a v-if="image.url" :href="image.url" target="_blank" rel="noopener noreferrer">打开原文件 ↗</a>
                </footer>
              </article>
            </div>
            <p v-else class="image-placeholder">{{ imageState === 'loading' ? '正在获取飞书图片直链…' : `未上传${item.label}` }}</p>
          </section>
          <div v-if="imageMessage" class="image-warning">
            <span>{{ imageMessage }}</span>
            <button type="button" :disabled="imageState === 'loading'" @click="reloadImages">
              {{ imageState === 'loading' ? '正在加载…' : '重新加载附件' }}
            </button>
          </div>
        </section>

        <section class="document-section">
          <header class="section-heading">
            <span>03</span>
            <div><h2>服务方式与接单安排</h2></div>
          </header>
          <article class="answer-block">
            <small>可以提供的服务方式</small>
            <div class="tag-list service"><span v-for="item in listField('你可以提供哪些服务方式？')" :key="item">{{ item }}</span></div>
            <p v-if="otherDetail('你可以提供哪些服务方式？', '你可以提供哪些服务方式？-其他-补充内容')" class="answer-detail">
              {{ otherDetail('你可以提供哪些服务方式？', '你可以提供哪些服务方式？-其他-补充内容') }}
            </p>
          </article>
          <article class="answer-block">
            <small>通常可以接单的时间</small>
            <div class="tag-list"><span v-for="item in listField('你通常什么时候可以接单？')" :key="item">{{ item }}</span></div>
          </article>
          <article class="long-answer"><small>为什么申请成为鲲鹏匠人</small><p>{{ fieldText('你为什么申请成为鲲鹏匠人？') }}</p></article>
          <article class="long-answer quote"><small>想对张导说的话</small><p>{{ fieldText('你有什么想对张导说的？') }}</p></article>
        </section>

        <section class="document-section confirmation-section">
          <header class="section-heading">
            <span>04</span>
            <div><h2>申请确认</h2></div>
          </header>
          <ul>
            <li v-for="item in listField('申请确认')" :key="item"><b>✓</b><span>{{ item }}</span></li>
            <li v-if="!listField('申请确认').length"><b>!</b><span>申请人未勾选确认项</span></li>
          </ul>
        </section>

        <section id="artisan-decision" class="decision-section">
          <h2>完成本条审核</h2>
          <div class="decision-summary">
            <span>#{{ number }} · {{ displayName }}</span>
            <span>{{ attachmentCount }} 张图片证据</span>
          </div>
          <label class="review-note-field">
            <span>审核备注 <em>选填</em></span>
            <textarea v-model="reviewNote" maxlength="500" rows="4" placeholder="例如：动手经验扎实，作品完整；或记录需要复核的原因。可以留空。"></textarea>
            <small>{{ reviewNote.length }} / 500 · 会和审核结果一起保存到飞书</small>
          </label>
          <div class="decision-actions">
            <button class="approve" type="button" :disabled="reviewState === 'saving'" @click="saveReview('通过')"><span>1</span><strong>通过</strong></button>
            <button class="reject" type="button" :disabled="reviewState === 'saving'" @click="saveReview('不通过')"><span>2</span><strong>不通过</strong></button>
          </div>
          <p v-if="reviewMessage" class="review-message" :class="reviewState">{{ reviewMessage }}</p>
          <div class="decision-navigation">
            <button type="button" :disabled="pageState === 'loading' || reviewState === 'saving'" @click="openAdjacent('previous')">← 上一位</button>
            <button type="button" :disabled="pageState === 'loading' || reviewState === 'saving'" @click="openAdjacent('next')">暂不判断，下一位 →</button>
          </div>
          <small class="shortcut-hint">快捷键：1 通过 · 2 不通过 · ← 上一位 · → 下一位</small>
        </section>
      </div>
    </template>

    <div v-if="lightboxImage" class="artisan-lightbox" role="button" tabindex="0" aria-label="关闭原图" @click="openLightbox(lightboxImage)" @keydown.enter="openLightbox(lightboxImage)">
      <img :src="lightboxImage.url" :alt="lightboxImage.filename" referrerpolicy="no-referrer">
      <div><strong>{{ lightboxImage.filename }}</strong><small>点击任意位置关闭原图</small></div>
    </div>
  </main>
</template>
