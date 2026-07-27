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

const current = computed(() => records.value[currentIndex.value] || null)
const reviewedCount = computed(() => Object.keys(decisions.value).length)
const progressPercent = computed(() => (
  records.value.length ? Math.round((reviewedCount.value / records.value.length) * 100) : 0
))
const currentDecision = computed(() => (
  current.value ? decisions.value[current.value.id] : null
))

function normalizeText(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').trim()
}

function redactSensitive(value) {
  return normalizeText(value)
    .replace(/\b1[3-9]\d{9}\b/g, '[手机号已隐藏]')
    .replace(/\b(?:[0-9a-f]{2}[:-]?){5}[0-9a-f]{2}\b/gi, '[MAC 已隐藏]')
    .replace(/\b89\d{15,20}\b/g, '[ICCID 已隐藏]')
    .replace(/\bwxid_[a-z0-9_]+\b/gi, '[微信号已隐藏]')
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

  return {
    id,
    nickname: douyinNickname || wechatNickname || `申请人 ${id}`,
    wechatNickname,
    submittedAt: normalizeText(row['提交时间']) || '时间未知',
    groups: GROUPS.map((group) => ({
      ...group,
      questions: group.questions.map((question) => buildQuestion(row, question)),
    })),
    row,
  }
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

function linkedQuestions(group) {
  return group.questions.filter((question) => question.evidence)
}

function revokeObjectUrls() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url))
  objectUrls = []
}

async function loadCurrentImages() {
  const record = current.value
  if (!record || !zipArchive.value) {
    currentImages.value = new Map()
    return
  }

  const token = ++imageLoadToken
  imageLoading.value = true
  revokeObjectUrls()

  const imageMap = new Map()
  for (const field of ATTACHMENT_FIELDS) {
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

    const builtRecords = data
      .filter((row) => normalizeText(row['编号']))
      .map(buildRecord)

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
    importState.value = 'ready'
    importMessage.value = `已从 ${csvSourceName} 载入 ${builtRecords.length} 条记录`
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
  document.querySelector('.screening-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  await loadCurrentImages()
}

function goNext() {
  showRecord(Math.min(currentIndex.value + 1, records.value.length - 1))
}

function goPrevious() {
  showRecord(Math.max(currentIndex.value - 1, 0))
}

function saveDecision(decision) {
  if (!current.value) return

  const now = new Date()
  const updatedDecisions = {
    ...decisions.value,
    [current.value.id]: {
      result: decision,
      time: now.toLocaleString('zh-CN', { hour12: false }),
    },
  }
  decisions.value = updatedDecisions
  persistDecisions()
  revealResult.value = decision

  const batchComplete = records.value.length > 0
    && Object.keys(updatedDecisions).length === records.value.length

  if (batchComplete && !autoExported.value) {
    autoExported.value = true
    exportResults(updatedDecisions)
  }

  window.clearTimeout(decisionTimer)
  decisionTimer = window.setTimeout(() => {
    if (currentIndex.value < records.value.length - 1) {
      showRecord(currentIndex.value + 1)
    } else {
      revealResult.value = null
    }
  }, 1150)
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
      decisionSource[record.id].result,
      decisionSource[record.id].time,
    ])

  if (!rows.length) return

  const csv = [
    ['编号', '直播筛选结果', '直播筛选时间'],
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
  if (bundleInput.value) bundleInput.value.value = ''
  if (csvInput.value) csvInput.value.value = ''
}

function openEvidence(image) {
  lightboxImage.value = lightboxImage.value?.src === image.src ? null : image
}

onBeforeUnmount(() => {
  window.clearTimeout(decisionTimer)
  revokeObjectUrls()
})
</script>

<template>
  <main class="screening-page">
    <div class="screening-ambient" aria-hidden="true"></div>

    <section v-if="!current" class="import-shell">
      <div class="import-mark" aria-hidden="true">鲲</div>
      <p class="eyebrow">TIANHUO LIVE SCREENING</p>
      <h1>导入本场筛选资料</h1>
      <p class="import-intro">
        选择包含 CSV 和附件文件夹的 ZIP。数据只在当前浏览器中读取，不上传服务器，也不会写回飞书。
      </p>

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
          <button type="button" :disabled="!reviewedCount" @click="exportResults()">导出结果</button>
          <button type="button" class="quiet" @click="resetBatch">更换批次</button>
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
                <span class="precheck-badge">已通过初筛 · 本地只读审核</span>
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
              <button type="button" :disabled="currentIndex === 0" @click="goPrevious">
                <span>←</span> 上一位
              </button>
              <strong>{{ currentIndex + 1 }} / {{ records.length }}</strong>
              <button
                type="button"
                :disabled="currentIndex === records.length - 1"
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

                <header class="linked-evidence-heading">
                  <span>Q{{ String(question.evidence.number).padStart(2, '0') }}</span>
                  <div>
                    <small>ORIGINAL IMAGE</small>
                    <h3>{{ question.evidence.question }}</h3>
                  </div>
                  <em v-if="questionImages(question).length">
                    {{ questionImages(question).length }} 张原图
                  </em>
                </header>

                <div v-if="imageLoading" class="image-loading">
                  <span class="spinner"></span>
                  正在读取原图
                </div>

                <div v-else-if="questionImages(question).length" class="evidence-images">
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

                <div v-else class="no-evidence">本题未提供附件</div>
              </article>
            </div>
          </section>
        </div>
      </div>

      <button
        type="button"
        class="decision-button decision-reject"
        :class="{ selected: currentDecision?.result === '不通过' }"
        @click="saveDecision('不通过')"
      >
        <span>×</span>
        <strong>不通过</strong>
      </button>

      <button
        type="button"
        class="decision-button decision-approve"
        :class="{ selected: currentDecision?.result === '通过' }"
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
          {{ reviewedCount === records.length ? '全部完成 · 结果已自动导出' : '结果已保存到本机' }}
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
