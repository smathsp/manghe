<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { createEduLiveSync } from './eduLiveSync'
import './edu-live.css'

const current = ref(null)
const connected = ref(false)
const lastSignalAt = ref(0)
const reviewNote = ref('')
const reviewState = ref('idle')
const reviewMessage = ref('')
let sync = null
let viewerTimer = null
let connectionTimer = null

const initialReviewClass = computed(() => {
  if (current.value?.initialReviewResult === '通过') return 'passed'
  if (current.value?.initialReviewResult === '不通过') return 'rejected'
  return 'pending'
})

function markConnected() {
  connected.value = true
  lastSignalAt.value = Date.now()
}

function handleMessage(message) {
  if (message.type === 'controller-heartbeat') markConnected()
  if (message.type === 'record') {
    markConnected()
    if (current.value?.number !== message.payload?.number) {
      reviewNote.value = ''
      reviewState.value = 'idle'
      reviewMessage.value = ''
    }
    current.value = message.payload
  }
  if (message.type === 'clear') {
    markConnected()
    current.value = null
  }
  if (message.type === 'controller-offline') {
    connected.value = false
    current.value = null
  }
  if (message.type === 'review-status') {
    markConnected()
    reviewState.value = message.payload?.state || 'idle'
    reviewMessage.value = message.payload?.message || ''
  }
  if (message.type === 'scroll-state') applyRemoteScroll(message.payload)
}

function applyRemoteScroll(state) {
  if (!state?.section) return
  window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
    const target = document.querySelector(`[data-live-section="${state.section}"]`)
    if (!target) return
    const targetTop = target.getBoundingClientRect().top + window.scrollY
    const markerOffset = window.innerHeight * .3
    const sectionProgress = Math.max(0, Math.min(1, Number(state.progress) || 0))
    const top = targetTop + (target.offsetHeight * sectionProgress) - markerOffset
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' })
  }))
}

function announceViewer() {
  sync?.send('viewer-ready')
}

function requestReview(result) {
  if (!connected.value || !current.value || reviewState.value === 'saving') return
  if (result !== '通过' && !reviewNote.value.trim()) {
    reviewState.value = 'error'
    reviewMessage.value = result === '待补材料'
      ? '请先填写需要补充的材料'
      : '请先填写不通过原因'
    return
  }
  reviewState.value = 'saving'
  reviewMessage.value = `正在提交“${result}”…`
  sync?.send('review-command', { result, note: reviewNote.value.trim() })
}

function onKeydown(event) {
  if (!current.value || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return
  if (event.key === '1') requestReview('通过')
  if (event.key === '2') requestReview('待补材料')
  if (event.key === '3') requestReview('不通过')
}

onMounted(() => {
  sync = createEduLiveSync(handleMessage)
  announceViewer()
  viewerTimer = window.setInterval(announceViewer, 4_000)
  connectionTimer = window.setInterval(() => {
    if (Date.now() - lastSignalAt.value <= 14_000) return
    connected.value = false
    current.value = null
  }, 2_000)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.clearInterval(viewerTimer)
  window.clearInterval(connectionTimer)
  window.removeEventListener('keydown', onKeydown)
  sync?.close()
})
</script>

<template>
  <main class="edu-live-page">
    <div class="live-grid" aria-hidden="true"></div>

    <header class="live-topbar">
      <div class="live-brand">
        <span>E</span>
        <div><strong>EDU 学生版</strong><small>LIVE REVIEW · SAFE DISPLAY</small></div>
      </div>
      <div class="live-connection" :class="{ connected }">
        <i></i>{{ connected ? '控制页已连接' : '等待控制页连接' }}
      </div>
      <div class="live-safety"><b>安全展示</b><span>不接收手机号 · 位置 · 原图</span></div>
    </header>

    <section v-if="!current" class="live-waiting">
      <span class="waiting-orbit"><i></i></span>
      <p>EDU LIVE REVIEW</p>
      <h1>{{ connected ? '等待选择申请人' : '请先打开审核控制页' }}</h1>
      <small>{{ connected ? '控制页打开申请记录后，这里会自动同步安全内容。' : '两个页面需要在同一浏览器的两个窗口中打开。' }}</small>
    </section>

    <article v-else class="live-record">
      <header class="live-candidate" data-live-section="candidate">
        <div class="live-number"><span>APPLICATION</span><strong>#{{ current.number }}</strong></div>
        <div class="live-identity">
          <small>抖音昵称</small>
          <h1>{{ current.nickname }}</h1>
          <p>{{ current.school }} · {{ current.category }}</p>
        </div>
        <div class="live-head-facts">
          <div class="live-living-expense"><span>生活费档位</span><strong>{{ current.livingExpense }}</strong></div>
          <div class="live-final-status" :class="{ reviewed: current.reviewResult !== '待审核' }">
            <span>最终审核</span><strong>{{ current.reviewResult }}</strong>
          </div>
        </div>
      </header>

      <section class="live-initial-review" :class="initialReviewClass" data-live-section="initial">
        <header><div><small>MANUAL PRE-REVIEW</small><h2>人工初审</h2></div><strong>{{ current.initialReviewResult }}</strong></header>
        <div><span>初审备注</span><p>{{ current.initialReviewNote }}</p></div>
      </section>

      <section class="live-answer live-answer-primary" data-live-section="reason">
        <header><span>01</span><div><small>WHY EDU</small><h2>为什么申请 EDU 学生版？</h2></div></header>
        <p>{{ current.reason }}</p>
      </section>

      <section class="live-answer" data-live-section="network">
        <header><span>02</span><div><small>REAL NEEDS</small><h2>真实网络需求</h2></div></header>
        <div class="live-tags"><span v-for="item in current.networkProblems" :key="item">{{ item }}</span><em v-if="!current.networkProblems.length">未填写</em></div>
        <p v-if="current.networkSupplement" class="live-supplement">{{ current.networkSupplement }}</p>
      </section>

      <section class="live-proof-summary" data-live-section="proof">
        <header class="live-proof-heading">
          <div><small>PROOF STATUS</small><h2>学生身份证明</h2></div>
          <strong>{{ current.proofStatus }}</strong>
        </header>
        <div v-if="current.blurredImages?.length" class="live-proof-grid">
          <figure v-for="(image, index) in current.blurredImages" :key="`${image.label}-${index}`">
            <div><img :src="image.src" alt="已安全模糊的证明材料"><span>安全模糊</span></div>
            <figcaption>{{ image.label }}</figcaption>
          </figure>
        </div>
        <p v-else>安全模糊预览生成中，原图不会进入直播页面。</p>
      </section>

      <section class="live-answer" data-live-section="discovery">
        <header><span>03</span><div><small>DISCOVERY</small><h2>如何了解到鲲鹏？</h2></div></header>
        <p>{{ current.discovery }}</p>
      </section>

      <section class="live-answer" data-live-section="feedback">
        <header><span>04</span><div><small>HONEST FEEDBACK</small><h2>怎么看张导？</h2></div></header>
        <p>{{ current.viewOnZhang }}</p>
      </section>

      <section class="live-answer live-commitment" data-live-section="commitment">
        <header><span>05</span><div><small>COMMITMENT</small><h2>体验反馈与信息确认</h2></div></header>
        <div class="live-commitment-grid">
          <div><h3>愿意参与</h3><ul><li v-for="item in current.feedbackItems" :key="item">{{ item }}</li><li v-if="!current.feedbackItems.length">未填写</li></ul></div>
          <div><h3>已确认 {{ current.confirmationItems.length }} / 6</h3><ul><li v-for="item in current.confirmationItems" :key="item">{{ item }}</li><li v-if="!current.confirmationItems.length">未确认</li></ul></div>
        </div>
      </section>

      <section class="live-decision" data-live-section="decision">
        <header><div><small>FINAL REVIEW</small><h2>审核判断</h2></div><span>快捷键 1 / 2 / 3</span></header>
        <label>
          <span>审核备注 <small>{{ reviewNote.length }} / 500</small></span>
          <textarea v-model="reviewNote" maxlength="500" placeholder="待补材料或不通过时，请填写原因…"></textarea>
        </label>
        <div class="live-decision-actions">
          <button class="approve" type="button" :disabled="!connected || reviewState === 'saving'" @click="requestReview('通过')"><b>1</b><strong>通过</strong><small>身份与需求可信</small></button>
          <button class="supplement" type="button" :disabled="!connected || reviewState === 'saving'" @click="requestReview('待补材料')"><b>2</b><strong>待补材料</strong><small>说明需要补充的内容</small></button>
          <button class="reject" type="button" :disabled="!connected || reviewState === 'saving'" @click="requestReview('不通过')"><b>3</b><strong>不通过</strong><small>记录审核原因</small></button>
        </div>
        <p v-if="reviewMessage" class="live-review-message" :class="reviewState">{{ reviewMessage }}</p>
      </section>
    </article>

    <footer class="live-footer">EDU 学生版 · 直播安全展示</footer>
  </main>
</template>
