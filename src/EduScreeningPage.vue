<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import './edu-screening.css'

const phoneQuery = ref('')
const douyinQuery = ref('')
const accessKey = ref('')
const rememberPassword = ref(false)
const passwordSettingsOpen = ref(false)
const lastSearchType = ref('')
const lastRequest = ref(null)
const results = ref([])
const current = ref(null)
const currentSummary = ref(null)
const searchState = ref('idle')
const reviewState = ref('idle')
const message = ref('')
const reviewMessage = ref('')
const reviewNote = ref('')
const stats = ref({ total: 0, reviewed: 0, pending: 0 })
const imageUrls = ref(new Map())
const imageState = ref(new Map())
const lightbox = ref(null)
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const PASSWORD_STORAGE_KEY = 'manghe-edu-screening-access-key'

const PROOF_FIELDS = [
  { key: '真实校园证明', label: '真实校园证明', for: 'all' },
  { key: '【高中生】需要你的学生证', label: '学生证', for: '高中生' },
  { key: '【高中生】高考准考证', label: '高考准考证', for: '高中生' },
]

function normalize(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(normalize).filter(Boolean).join('、')
  if (typeof value === 'object') {
    return normalize(value.full_address ?? value.name ?? value.text ?? value.value ?? value.address ?? '')
  }
  return String(value).trim()
}

function valueList(value) {
  if (Array.isArray(value)) return value.map(normalize).filter(Boolean)
  const normalized = normalize(value)
  return normalized ? [normalized] : []
}

function field(name) {
  return current.value?.fields?.[name]
}

function fieldText(name, fallback = '未填写') {
  return normalize(field(name)) || fallback
}

function dateText(value) {
  if (!value) return '—'
  if (typeof value === 'number' || /^\d{13}$/.test(String(value))) {
    return new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).format(new Date(Number(value)))
  }
  return normalize(value)
}

function attachmentItems(name) {
  const value = field(name)
  return Array.isArray(value) ? value.filter((item) => item?.file_token) : []
}

const applicantNumber = computed(() => fieldText('编号', currentSummary.value?.number || '—'))
const school = computed(() => fieldText('你的学校名称是？', currentSummary.value?.school || '未填写学校'))
const douyinNickname = computed(() => fieldText('你的抖音昵称', currentSummary.value?.douyin || '未填写抖音昵称'))
const category = computed(() => fieldText('你是属于以下哪一种分类？', currentSummary.value?.category || '未分类'))
const isHighSchool = computed(() => /高中|准大学/.test(category.value))
const submitTime = computed(() => dateText(field('提交时间') || currentSummary.value?.submitted_at))
const existingResult = computed(() => fieldText('EDU审核结果', ''))
const initialReviewResult = computed(() => fieldText('人工初审结果', '未初审'))
const initialReviewNote = computed(() => fieldText('人工初审备注', '暂无初审备注'))
const initialReviewClass = computed(() => {
  if (initialReviewResult.value === '通过') return 'passed'
  if (initialReviewResult.value === '不通过') return 'rejected'
  return 'pending'
})

const proofCards = computed(() => PROOF_FIELDS
  .filter((item) => item.for === 'all' || (item.for === '高中生' && isHighSchool.value))
  .map((item) => ({ ...item, items: attachmentItems(item.key) })))

const confirmationItems = computed(() => valueList(field('信息确认')))
const networkProblems = computed(() => valueList(field('你目前遇到的主要网络问题是什么？')))
const feedbackItems = computed(() => valueList(field('是否愿意参与后续产品体验反馈？')))

const proofStatus = computed(() => {
  if (isHighSchool.value) {
    return attachmentItems('【高中生】需要你的学生证').length
      || attachmentItems('【高中生】高考准考证').length
      ? '已提供高中生证明'
      : '缺少高中生证明'
  }
  return attachmentItems('真实校园证明').length
    ? '已提交身份材料'
    : '未提交身份材料'
})

const progressPercent = computed(() => stats.value.total
  ? Math.round((stats.value.reviewed / stats.value.total) * 100)
  : 0)

async function api(path, body = {}, blob = false) {
  const controller = new AbortController()
  const timeoutMs = blob ? 20_000 : 12_000
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(path, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey: accessKey.value, ...body }),
    })
    if (blob) {
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || '读取证明材料失败')
      }
      return await response.blob()
    }
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '连接飞书审核服务失败')
    return data
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(blob ? '证明材料读取超时，点击重试' : '连接飞书超时，请重试')
    }
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}

function updateStats(value) {
  if (value) stats.value = value
}

function ensurePassword() {
  if (accessKey.value) return true
  passwordSettingsOpen.value = true
  searchState.value = 'error'
  message.value = '请先输入审核密码'
  nextTick(() => document.querySelector('#edu-access-key')?.focus())
  return false
}

async function search(type) {
  if (!ensurePassword()) return
  const query = type === 'phone' ? phoneQuery.value.trim() : douyinQuery.value.trim()
  if (!query) {
    message.value = type === 'phone' ? '请输入手机号' : '请输入抖音昵称'
    return
  }
  lastSearchType.value = type
  lastRequest.value = { kind: 'search', type }
  searchState.value = 'loading'
  message.value = '正在从飞书读取申请人…'
  try {
    const data = await api('/api/edu/search', { type, query })
    results.value = data.records || []
    updateStats(data.stats)
    searchState.value = 'ready'
    message.value = results.value.length ? `找到 ${results.value.length} 位申请人` : '没有匹配的申请人'
  } catch (error) {
    searchState.value = 'error'
    message.value = error.message
  }
}

async function openNext() {
  if (!ensurePassword()) return
  if (searchState.value === 'loading') return
  lastRequest.value = { kind: 'next' }
  searchState.value = 'loading'
  message.value = '正在寻找下一位未审核申请人…'
  try {
    const data = await api('/api/edu/next', { afterNumber: current.value ? applicantNumber.value : '' })
    updateStats(data.stats)
    if (!data.record) {
      searchState.value = 'ready'
      message.value = '所有申请人都已完成审核'
      return
    }
    await openRecord(data.record)
  } catch (error) {
    searchState.value = 'error'
    message.value = error.message
  }
}

function revokeImages() {
  for (const url of imageUrls.value.values()) URL.revokeObjectURL(url)
  imageUrls.value = new Map()
  imageState.value = new Map()
}

async function openRecord(summary) {
  lastRequest.value = { kind: 'record', summary }
  searchState.value = 'loading'
  message.value = '正在展开完整申请材料…'
  revokeImages()
  try {
    const data = await api('/api/edu/record', { recordId: summary.record_id })
    current.value = data.record
    currentSummary.value = summary
    reviewNote.value = normalize(data.record.fields?.['EDU审核备注'])
    results.value = []
    phoneQuery.value = ''
    douyinQuery.value = ''
    searchState.value = 'ready'
    message.value = ''
    await nextTick()
    loadProofImages()
  } catch (error) {
    searchState.value = 'error'
    message.value = error.message
  }
}

function retryLastRequest() {
  const request = lastRequest.value
  if (!request) return
  if (request.kind === 'search') search(request.type)
  if (request.kind === 'next') openNext()
  if (request.kind === 'record') openRecord(request.summary)
}

async function loadProofImage(fieldName, attachment) {
  const key = attachment.file_token
  imageState.value.set(key, 'loading')
  imageState.value = new Map(imageState.value)
  try {
    const blob = await api('/api/edu/attachment', {
      recordId: current.value.record_id,
      fieldName,
      fileToken: attachment.file_token,
      filename: attachment.name,
    }, true)
    imageUrls.value.set(key, URL.createObjectURL(blob))
    imageUrls.value = new Map(imageUrls.value)
    imageState.value.set(key, 'ready')
  } catch {
    imageState.value.set(key, 'error')
  }
  imageState.value = new Map(imageState.value)
}

async function loadProofImages() {
  const tasks = []
  for (const card of proofCards.value) {
    for (const attachment of card.items) tasks.push(loadProofImage(card.key, attachment))
  }
  const workers = Array.from({ length: Math.min(3, tasks.length) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < tasks.length; index += 3) await tasks[index]
  })
  await Promise.all(workers)
}

function openImage(fieldName, attachment) {
  const src = imageUrls.value.get(attachment.file_token)
  if (!src) return
  lightbox.value = { src, label: `${fieldName} · ${attachment.name}` }
}

async function saveReview(result) {
  if (!current.value || reviewState.value === 'saving') return
  if (result !== '通过' && !reviewNote.value.trim()) {
    reviewMessage.value = result === '待补材料'
      ? '请在备注里写明需要补充什么材料'
      : '请简单写明不通过原因'
    return
  }
  reviewState.value = 'saving'
  reviewMessage.value = `正在保存“${result}”…`
  try {
    const wasReviewed = Boolean(existingResult.value)
    await api('/api/edu/review', {
      recordId: current.value.record_id,
      result,
      note: reviewNote.value,
    })
    current.value.fields['EDU审核结果'] = [result]
    current.value.fields['EDU审核备注'] = reviewNote.value
    reviewState.value = 'saved'
    reviewMessage.value = `已同步到飞书：${result}`
    stats.value.reviewed = Math.min(stats.value.total, stats.value.reviewed + (wasReviewed ? 0 : 1))
    stats.value.pending = Math.max(0, stats.value.total - stats.value.reviewed)
    window.setTimeout(() => openNext(), 620)
  } catch (error) {
    reviewState.value = 'error'
    reviewMessage.value = error.message
  }
}

function resetSearch() {
  current.value = null
  currentSummary.value = null
  message.value = ''
  reviewMessage.value = ''
  revokeImages()
}

function onKeydown(event) {
  if (!current.value || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
  if (event.key === '1') saveReview('通过')
  if (event.key === '2') saveReview('待补材料')
  if (event.key === '3') saveReview('不通过')
}

watch([accessKey, rememberPassword], () => {
  if (rememberPassword.value && accessKey.value) {
    window.localStorage.setItem(PASSWORD_STORAGE_KEY, accessKey.value)
  } else {
    window.localStorage.removeItem(PASSWORD_STORAGE_KEY)
  }
})

onMounted(() => {
  const savedPassword = window.localStorage.getItem(PASSWORD_STORAGE_KEY)
  if (savedPassword) {
    accessKey.value = savedPassword
    rememberPassword.value = true
  }
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  revokeImages()
})
</script>

<template>
  <main class="edu-review-page">
    <div class="edu-grid" aria-hidden="true"></div>

    <header class="edu-topbar">
      <a class="edu-brand" href="/edu-screening" aria-label="EDU 学生版审核台首页">
        <span class="brand-mark">E</span>
        <span><strong>EDU 学生版</strong><small>STUDENT ACCESS REVIEW</small></span>
      </a>
      <div class="queue-progress" aria-label="审核进度">
        <span>已审核 {{ stats.reviewed }} / {{ stats.total || '—' }}</span>
        <i><b :style="{ width: `${progressPercent}%` }"></b></i>
        <em>{{ stats.pending }} 待处理</em>
      </div>
      <button v-if="current" class="topbar-action" type="button" @click="resetSearch">返回搜索</button>
    </header>

    <section v-if="!current" class="edu-entry">
      <div class="entry-copy">
        <span class="entry-kicker"><i></i> EDU ACCESS · 2026</span>
        <h1>把真正需要的人，<br><em>先找出来。</em></h1>
        <p>先验学生身份，再看真实需求与反馈意愿。审核结果通过安全服务同步回飞书。</p>
        <div class="entry-rules">
          <span><b>01</b> 身份真实</span>
          <span><b>02</b> 需求明确</span>
          <span><b>03</b> 愿意反馈</span>
        </div>
      </div>

      <div class="entry-console">
        <div class="console-heading">
          <span>REVIEW QUEUE</span>
          <strong>学生申请队列</strong>
          <div class="console-tools">
            <small>{{ isLocal ? '本地 CLI 已就绪' : 'Vercel 安全连接' }}</small>
            <button
              class="credential-toggle"
              type="button"
              :aria-expanded="passwordSettingsOpen"
              aria-controls="edu-password-settings"
              @click="passwordSettingsOpen = !passwordSettingsOpen"
            >
              <i :class="{ ready: accessKey }"></i>
              {{ accessKey ? '密码已设置' : '审核设置' }}
            </button>
          </div>
        </div>

        <div v-if="passwordSettingsOpen" id="edu-password-settings" class="password-panel">
          <label for="edu-access-key"><span>审核密码</span><small>独立验证，不与查询内容一起保存</small></label>
          <div class="password-row">
            <input
              id="edu-access-key"
              v-model="accessKey"
              type="password"
              autocomplete="current-password"
              placeholder="请输入审核访问密码"
            >
            <label class="remember-password">
              <input v-model="rememberPassword" type="checkbox">
              <span>保存在本机</span>
            </label>
          </div>
        </div>

        <div class="edu-search-grid">
          <form class="edu-search-card" @submit.prevent="search('phone')">
            <label for="edu-phone-search"><span>手机号查找</span><small>输入与结果均隐藏</small></label>
            <div>
              <input
                id="edu-phone-search"
                v-model.trim="phoneQuery"
                type="password"
                inputmode="numeric"
                autocomplete="off"
                maxlength="11"
                placeholder="输入 11 位手机号"
              >
              <button type="submit" :disabled="searchState === 'loading'">查找</button>
            </div>
          </form>

          <form class="edu-search-card" @submit.prevent="search('douyin')">
            <label for="edu-douyin-search"><span>抖音昵称查找</span><small>支持昵称模糊匹配</small></label>
            <div>
              <input
                id="edu-douyin-search"
                v-model.trim="douyinQuery"
                type="search"
                autocomplete="off"
                maxlength="50"
                placeholder="输入抖音昵称"
              >
              <button type="submit" :disabled="searchState === 'loading'">查找</button>
            </div>
          </form>
        </div>

        <button class="next-candidate" type="button" :disabled="searchState === 'loading'" @click="openNext">
          <span><small>NEXT CANDIDATE</small><strong>打开下一位未审核学生</strong></span>
          <b>→</b>
        </button>

        <div v-if="message" class="edu-message" :class="searchState">
          <span>{{ message }}</span>
          <button v-if="searchState === 'error' && lastRequest" type="button" @click="retryLastRequest">重试</button>
        </div>

        <div v-if="results.length" class="edu-results">
          <button v-for="record in results" :key="record.record_id" type="button" @click="openRecord(record)">
            <span class="result-no">#{{ record.number }}</span>
            <span class="result-copy"><strong>{{ record.douyin || '未填写抖音昵称' }}</strong><small>{{ record.school }} · {{ record.category }} · {{ record.phone || '***' }}</small></span>
            <em :class="{ reviewed: record.review_result }">{{ record.review_result || '待审核' }}</em>
          </button>
        </div>

        <div class="console-footnote">
          <span>审核原则</span>
          <p>手机号由服务端直接替换为 ***；审核密码只在选择后保存在当前浏览器。</p>
        </div>
      </div>
    </section>

    <section v-else class="review-workspace">
      <aside class="candidate-rail">
        <div class="candidate-index"><span>APPLICATION</span><strong>#{{ applicantNumber }}</strong></div>
        <div class="candidate-school">
          <span class="student-seal">{{ douyinNickname.slice(0, 1) }}</span>
          <small>抖音昵称</small>
          <h1>{{ douyinNickname }}</h1>
          <p>{{ school }} · {{ category }} · {{ currentSummary?.phone || '***' }} · {{ submitTime }}</p>
        </div>
        <div class="candidate-facts">
          <div><span>生活费档位</span><strong>{{ fieldText('你的每月生活费档位') }}</strong></div>
          <div><span>大致位置</span><strong>{{ fieldText('我们需要知道你大致的位置') }}</strong></div>
          <div><span>当前状态</span><strong :class="{ done: existingResult }">{{ existingResult || '等待审核' }}</strong></div>
        </div>
        <div class="privacy-note"><b>隐私模式</b><p>联系方式与证件原图不进入公开页面，审核材料仅在本机临时读取。</p></div>
      </aside>

      <div class="dossier">
        <section class="dossier-hero">
          <div><span>STUDENT DOSSIER</span><h2>学生申请档案</h2></div>
          <div class="proof-pill" :class="{ warning: /缺少|未提交/.test(proofStatus) }"><i></i>{{ proofStatus }}</div>
        </section>

        <section class="initial-review-card" :class="initialReviewClass">
          <header>
            <div><span>MANUAL PRE-REVIEW</span><h3>人工初审</h3></div>
            <strong>{{ initialReviewResult }}</strong>
          </header>
          <div>
            <span>初审备注</span>
            <p>{{ initialReviewNote }}</p>
          </div>
        </section>

        <section class="story-card primary-story">
          <header><span>01</span><div><small>WHY EDU</small><h3>为什么申请 EDU 学生版？</h3></div></header>
          <p>{{ fieldText('请简单说明你申请EDU版本的主要原因') }}</p>
        </section>

        <section class="issue-section">
          <header class="section-title"><span>02</span><div><small>REAL NEEDS</small><h3>真实网络需求</h3></div></header>
          <div class="tag-list"><span v-for="item in networkProblems" :key="item">{{ item }}</span><em v-if="!networkProblems.length">未填写</em></div>
          <p v-if="fieldText('你目前遇到的主要网络问题是什么？-其他-补充内容', '')" class="supplement">{{ fieldText('你目前遇到的主要网络问题是什么？-其他-补充内容') }}</p>
        </section>

        <section class="proof-section">
          <header class="section-title"><span>03</span><div><small>PROOF OF STUDENT</small><h3>学生身份证明</h3></div></header>
          <div class="proof-grid">
            <article v-for="card in proofCards" :key="card.key" class="proof-card" :class="{ empty: !card.items.length }">
              <header><span>{{ card.label }}</span><em>{{ card.items.length }} 份</em></header>
              <div v-if="card.items.length" class="proof-images">
                <button
                  v-for="attachment in card.items"
                  :key="attachment.file_token"
                  type="button"
                  @click="imageState.get(attachment.file_token) === 'error' ? loadProofImage(card.key, attachment) : openImage(card.label, attachment)"
                >
                  <img v-if="imageUrls.get(attachment.file_token)" :src="imageUrls.get(attachment.file_token)" :alt="`${card.label} ${attachment.name}`">
                  <span v-else-if="imageState.get(attachment.file_token) === 'error'">读取失败，点击重试</span>
                  <span v-else class="image-loading">读取中</span>
                  <small>{{ attachment.name }}</small>
                </button>
              </div>
              <p v-else>未提交此项材料</p>
            </article>
          </div>
        </section>

        <section class="story-grid">
          <article class="story-card">
            <header><span>04</span><div><small>DISCOVERY</small><h3>如何了解到鲲鹏？</h3></div></header>
            <p>{{ fieldText('你是通过什么渠道了解到鲲鹏的？哪一点让你考虑选择鲲鹏？请结合自己的使用需求简单说明。') }}</p>
          </article>
          <article class="story-card">
            <header><span>05</span><div><small>HONEST FEEDBACK</small><h3>怎么看张导？</h3></div></header>
            <p>{{ fieldText('作为学生，你是怎么看张导的，有什么不足之处，可以怎么改善') }}</p>
          </article>
        </section>

        <section class="commitment-section">
          <header class="section-title"><span>06</span><div><small>COMMITMENT</small><h3>体验反馈与信息确认</h3></div></header>
          <div class="commitment-columns">
            <div><h4>愿意参与</h4><ul><li v-for="item in feedbackItems" :key="item">{{ item }}</li><li v-if="!feedbackItems.length" class="muted">未填写</li></ul></div>
            <div><h4>已确认 {{ confirmationItems.length }} / 6</h4><ul><li v-for="item in confirmationItems" :key="item">{{ item }}</li><li v-if="!confirmationItems.length" class="muted">未确认</li></ul></div>
          </div>
        </section>
      </div>

      <aside class="decision-rail">
        <div class="decision-heading">
          <span>FINAL REVIEW</span>
          <h3>审核判断</h3>
          <p>结合初审意见与完整申请内容，选择最终结果。</p>
        </div>

        <label class="review-note">
          <span>审核备注 <small>{{ reviewNote.length }} / 500</small></span>
          <textarea v-model="reviewNote" maxlength="500" placeholder="缺什么材料、为什么通过或不通过…"></textarea>
        </label>

        <div class="decision-actions">
          <button class="approve" type="button" :disabled="reviewState === 'saving'" @click="saveReview('通过')"><span>1</span><strong>通过</strong><small>身份与需求可信</small></button>
          <button class="supplement-action" type="button" :disabled="reviewState === 'saving'" @click="saveReview('待补材料')"><span>2</span><strong>待补材料</strong><small>保留候选资格</small></button>
          <button class="reject" type="button" :disabled="reviewState === 'saving'" @click="saveReview('不通过')"><span>3</span><strong>不通过</strong><small>记录审核原因</small></button>
        </div>

        <p v-if="reviewMessage" class="review-message" :class="reviewState">{{ reviewMessage }}</p>
        <button class="skip-button" type="button" @click="openNext">暂不判断，跳到下一位 →</button>
        <div class="shortcut-tip"><span>键盘快捷键</span><b>1 通过</b><b>2 待补</b><b>3 不通过</b></div>
      </aside>
    </section>

    <div v-if="lightbox" class="edu-lightbox" role="button" tabindex="0" aria-label="关闭证明原图" @click="lightbox = null" @keydown.enter="lightbox = null">
      <img :src="lightbox.src" :alt="lightbox.label">
      <p>{{ lightbox.label }}<span>点击任意处关闭</span></p>
    </div>
  </main>
</template>
