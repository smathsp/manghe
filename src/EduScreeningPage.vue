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
const navigationMessage = ref('')
const reviewNote = ref('')
const stats = ref({ total: 0, reviewed: 0, pending: 0 })
const isLocal = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const PASSWORD_STORAGE_KEY = 'manghe-edu-screening-access-key'
let autoAdvanceTimer = null

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

const applicantNumber = computed(() => fieldText('编号', currentSummary.value?.number || '—'))
const school = computed(() => fieldText('你的学校名称是？', currentSummary.value?.school || '未填写学校'))
const douyinNickname = computed(() => fieldText('你的抖音昵称', currentSummary.value?.douyin || '未填写抖音昵称'))
const category = computed(() => fieldText('你是属于以下哪一种分类？', currentSummary.value?.category || '未分类'))
const submitTime = computed(() => dateText(field('提交时间') || currentSummary.value?.submitted_at))
const existingResult = computed(() => fieldText('EDU审核结果', ''))
const initialReviewResult = computed(() => fieldText('人工初审结果', '未初审'))
const initialReviewNote = computed(() => fieldText('人工初审备注', '暂无初审备注'))
const initialReviewClass = computed(() => {
  if (initialReviewResult.value === '通过') return 'passed'
  if (initialReviewResult.value === '不通过') return 'rejected'
  return 'pending'
})

const confirmationItems = computed(() => valueList(field('信息确认')))
const networkProblems = computed(() => valueList(field('你目前遇到的主要网络问题是什么？')))
const feedbackItems = computed(() => valueList(field('是否愿意参与后续产品体验反馈？')))

const progressPercent = computed(() => stats.value.total
  ? Math.round((stats.value.reviewed / stats.value.total) * 100)
  : 0)

async function api(path, body = {}) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 12_000)
  try {
    const response = await fetch(path, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey: accessKey.value, ...body }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.message || '连接飞书审核服务失败')
    return data
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('连接飞书超时，请重试')
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

function clearAutoAdvance() {
  if (!autoAdvanceTimer) return
  window.clearTimeout(autoAdvanceTimer)
  autoAdvanceTimer = null
}

function scrollReviewToTop() {
  window.scrollTo({ top: 0, behavior: 'auto' })
  document.querySelectorAll('.candidate-rail, .dossier, .decision-rail').forEach((element) => {
    element.scrollTo({ top: 0, behavior: 'auto' })
  })
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
    passwordSettingsOpen.value = false
    searchState.value = 'ready'
    message.value = results.value.length ? `找到 ${results.value.length} 位申请人` : '没有匹配的申请人'
  } catch (error) {
    searchState.value = 'error'
    message.value = error.message
  }
}

async function openNext() {
  clearAutoAdvance()
  if (!ensurePassword()) return
  if (searchState.value === 'loading') return
  lastRequest.value = { kind: 'next' }
  searchState.value = 'loading'
  message.value = '正在寻找下一位已完成人工初审的申请人…'
  try {
    const data = await api('/api/edu/next', { afterNumber: current.value ? applicantNumber.value : '' })
    updateStats(data.stats)
    if (!data.record) {
      searchState.value = 'ready'
      message.value = '暂无已完成人工初审且等待 EDU 审核的学生'
      navigationMessage.value = message.value
      if (current.value) reviewMessage.value = message.value
      return
    }
    await openRecord(data.record)
  } catch (error) {
    searchState.value = 'error'
    message.value = error.message
    if (current.value) {
      navigationMessage.value = error.message
      reviewState.value = 'error'
      reviewMessage.value = error.message
    }
  }
}

async function openAdjacent(direction) {
  clearAutoAdvance()
  if (!ensurePassword() || !current.value || searchState.value === 'loading') return
  lastRequest.value = { kind: 'adjacent', direction }
  searchState.value = 'loading'
  navigationMessage.value = ''
  try {
    const data = await api('/api/edu/next', {
      afterNumber: applicantNumber.value,
      direction,
      includeReviewed: true,
    })
    updateStats(data.stats)
    if (!data.record) {
      searchState.value = 'ready'
      navigationMessage.value = '暂无其他已完成人工初审的学生'
      return
    }
    await openRecord(data.record)
  } catch (error) {
    searchState.value = 'error'
    navigationMessage.value = error.message
  }
}

async function openRecord(summary) {
  clearAutoAdvance()
  lastRequest.value = { kind: 'record', summary }
  searchState.value = 'loading'
  message.value = '正在展开完整申请材料…'
  try {
    const data = await api('/api/edu/record', { recordId: summary.record_id })
    current.value = data.record
    currentSummary.value = summary
    reviewNote.value = normalize(data.record.fields?.['EDU审核备注'])
    reviewState.value = 'idle'
    reviewMessage.value = ''
    navigationMessage.value = ''
    passwordSettingsOpen.value = false
    results.value = []
    phoneQuery.value = ''
    douyinQuery.value = ''
    searchState.value = 'ready'
    message.value = ''
    await nextTick()
    scrollReviewToTop()
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
  if (request.kind === 'adjacent') openAdjacent(request.direction)
  if (request.kind === 'record') openRecord(request.summary)
}

async function saveReview(result) {
  if (!current.value || ['saving', 'saved'].includes(reviewState.value)) return
  if (result !== '通过' && !reviewNote.value.trim()) {
    reviewState.value = 'error'
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
    autoAdvanceTimer = window.setTimeout(() => openNext(), 700)
  } catch (error) {
    reviewState.value = 'error'
    reviewMessage.value = error.message
  }
}

function resetSearch() {
  clearAutoAdvance()
  current.value = null
  currentSummary.value = null
  message.value = ''
  reviewState.value = 'idle'
  reviewMessage.value = ''
  navigationMessage.value = ''
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

watch(reviewNote, () => {
  if (reviewState.value === 'error') {
    reviewState.value = 'idle'
    reviewMessage.value = ''
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
  clearAutoAdvance()
  window.removeEventListener('keydown', onKeydown)
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
      <div class="topbar-actions">
        <div v-if="current" class="topbar-candidate" aria-label="当前申请人">
          <span>#{{ applicantNumber }}</span><strong>{{ douyinNickname }}</strong>
        </div>
        <a v-if="current" class="topbar-action topbar-decision-link" href="#edu-decision">审核判断</a>
        <button v-if="current" class="topbar-action" type="button" @click="resetSearch">返回搜索</button>
      </div>
    </header>

    <section v-if="!current" class="edu-entry">
      <div class="entry-copy">
        <span class="entry-kicker"><i></i> EDU ACCESS · 2026</span>
        <h1>把真正需要的人，<br><em>先找出来。</em></h1>
        <p>先看人工初审结论，再看真实需求与反馈意愿。确认后的审核结果会安全同步回飞书。</p>
        <div class="entry-rules">
          <span><b>01</b> 已完成初审</span>
          <span><b>02</b> 需求明确</span>
          <span><b>03</b> 愿意反馈</span>
        </div>
      </div>

      <div class="entry-console" :aria-busy="searchState === 'loading'">
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
          <span><small>已初审 · 待 EDU 审核</small><strong>打开下一位学生</strong></span>
          <b>→</b>
        </button>

        <div v-if="message" class="edu-message" :class="searchState" role="status" aria-live="polite">
          <span>{{ message }}</span>
          <button v-if="searchState === 'error' && lastRequest" type="button" @click="retryLastRequest">重试</button>
        </div>

        <div v-if="results.length" class="edu-results">
          <button v-for="record in results" :key="record.record_id" type="button" :disabled="searchState === 'loading'" @click="openRecord(record)">
            <span class="result-no">#{{ record.number }}</span>
            <span class="result-copy"><strong>{{ record.douyin || '未填写抖音昵称' }}</strong><small>{{ record.school }} · {{ record.category }} · {{ record.phone || '***' }}</small></span>
            <em :class="{ reviewed: record.review_result }">{{ record.review_result || '待审核' }}</em>
          </button>
        </div>

        <div class="console-footnote">
          <span>队列规则</span>
          <p>“下一位”只读取已完成人工初审的学生；手机号始终显示为 ***，审核密码仅按你的选择保存在当前浏览器。</p>
        </div>
      </div>
    </section>

    <section v-else class="review-workspace">
      <aside class="candidate-rail">
        <div class="candidate-index"><span>APPLICATION</span><strong>#{{ applicantNumber }}</strong></div>
        <nav class="candidate-navigation" aria-label="申请人切换">
          <button type="button" :disabled="searchState === 'loading'" @click="openAdjacent('previous')">
            <span>←</span><strong>上一位</strong>
          </button>
          <button type="button" :disabled="searchState === 'loading'" @click="openAdjacent('next')">
            <strong>下一位</strong><span>→</span>
          </button>
        </nav>
        <p v-if="navigationMessage" class="candidate-navigation-message" role="status" aria-live="polite">{{ navigationMessage }}</p>
        <div class="candidate-school">
          <span class="student-seal">{{ douyinNickname.slice(0, 1) }}</span>
          <small>抖音昵称</small>
          <h1>{{ douyinNickname }}</h1>
          <p>{{ school }} · {{ category }} · {{ currentSummary?.phone || '***' }} · {{ submitTime }}</p>
        </div>
        <div class="candidate-facts">
          <div><span>生活费档位</span><strong>{{ fieldText('你的每月生活费档位') }}</strong></div>
          <div><span>当前状态</span><strong :class="{ done: existingResult }">{{ existingResult || '等待审核' }}</strong></div>
        </div>
        <div class="privacy-note"><b>纯文字审核</b><p>手机号始终脱敏；本页面不会请求、读取或展示任何证明照片。</p></div>
      </aside>

      <div class="dossier">
        <section class="dossier-hero">
          <div><span>STUDENT DOSSIER</span><h2>学生申请档案</h2></div>
          <div class="text-only-pill"><i></i>仅展示文字信息</div>
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

        <section class="story-grid">
          <article class="story-card">
            <header><span>03</span><div><small>DISCOVERY</small><h3>如何了解到鲲鹏？</h3></div></header>
            <p>{{ fieldText('你是通过什么渠道了解到鲲鹏的？哪一点让你考虑选择鲲鹏？请结合自己的使用需求简单说明。') }}</p>
          </article>
          <article class="story-card">
            <header><span>04</span><div><small>HONEST FEEDBACK</small><h3>怎么看张导？</h3></div></header>
            <p>{{ fieldText('作为学生，你是怎么看张导的，有什么不足之处，可以怎么改善') }}</p>
          </article>
        </section>

        <section class="commitment-section">
          <header class="section-title"><span>05</span><div><small>COMMITMENT</small><h3>体验反馈与信息确认</h3></div></header>
          <div class="commitment-columns">
            <div><h4>愿意参与</h4><ul><li v-for="item in feedbackItems" :key="item">{{ item }}</li><li v-if="!feedbackItems.length" class="muted">未填写</li></ul></div>
            <div><h4>已确认 {{ confirmationItems.length }} / 6</h4><ul><li v-for="item in confirmationItems" :key="item">{{ item }}</li><li v-if="!confirmationItems.length" class="muted">未确认</li></ul></div>
          </div>
        </section>
      </div>

      <aside id="edu-decision" class="decision-rail" :class="{ 'is-saved': reviewState === 'saved' }">
        <div class="decision-heading">
          <span>FINAL REVIEW</span>
          <h3>审核判断</h3>
          <p>结合初审意见与申请内容选择结果；保存成功后会自动进入下一位待审核学生。</p>
        </div>

        <label class="review-note">
          <span>审核备注 <small>{{ reviewNote.length }} / 500</small></span>
          <textarea v-model="reviewNote" maxlength="500" placeholder="缺什么材料、为什么通过或不通过…"></textarea>
        </label>

        <div class="decision-actions">
          <button class="approve" type="button" :disabled="['saving', 'saved'].includes(reviewState)" @click="saveReview('通过')"><span>1</span><strong>通过</strong><small>身份与需求可信</small></button>
          <button class="supplement-action" type="button" :disabled="['saving', 'saved'].includes(reviewState)" @click="saveReview('待补材料')"><span>2</span><strong>待补材料</strong><small>保留候选资格</small></button>
          <button class="reject" type="button" :disabled="['saving', 'saved'].includes(reviewState)" @click="saveReview('不通过')"><span>3</span><strong>不通过</strong><small>记录审核原因</small></button>
        </div>

        <p v-if="reviewMessage" class="review-message" :class="reviewState" role="status" aria-live="polite">{{ reviewMessage }}</p>
        <button class="skip-button" type="button" :disabled="reviewState === 'saving'" @click="openNext">暂不判断，打开下一位待审核 →</button>
        <div class="shortcut-tip"><span>键盘快捷键</span><b>1 通过</b><b>2 待补</b><b>3 不通过</b></div>
      </aside>
    </section>
  </main>
</template>
