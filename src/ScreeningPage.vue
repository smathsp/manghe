<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import './screening.css'

const records = [
  {
    id: 'KP-2026-0047',
    nickname: '山海之间',
    submittedAt: '07-27 10:42',
    images: [
      { src: '/images/C5800-688.png', label: '设备正面原图' },
      { src: '/images/C5800-688-result.png', label: '设备背面原图' },
    ],
    checks: [
      { label: '有鲲鹏 CPE', detail: '资料已确认', state: 'pass' },
      { label: '手机号有效', detail: '大陆 11 位号码', state: 'pass' },
      { label: 'MAC 可识别', detail: '格式校验通过', state: 'pass' },
      { label: '资料无重复', detail: '手机号与 MAC 均唯一', state: 'pass' },
    ],
  },
  {
    id: 'KP-2026-0048',
    nickname: '小满',
    submittedAt: '07-27 10:45',
    images: [
      { src: '/images/C2000PRO+.png', label: '设备原图' },
      { src: '/images/AK68-798.png', label: '补充资料原图' },
    ],
    checks: [
      { label: '有鲲鹏 CPE', detail: '资料已确认', state: 'pass' },
      { label: '手机号有效', detail: '大陆 11 位号码', state: 'pass' },
      { label: 'MAC 可识别', detail: '未识别到有效 MAC', state: 'fail' },
      { label: '资料无重复', detail: '手机号与 MAC 均唯一', state: 'pass' },
    ],
  },
  {
    id: 'KP-2026-0049',
    nickname: '白昼星河',
    submittedAt: '07-27 10:51',
    images: [
      { src: '/images/N6800.png', label: '设备原图' },
      { src: '/images/NBCPE-688.png', label: '设备铭牌原图' },
      { src: '/images/AM5.png', label: '补充资料原图' },
    ],
    checks: [
      { label: '有鲲鹏 CPE', detail: '资料已确认', state: 'pass' },
      { label: '手机号有效', detail: '大陆 11 位号码', state: 'pass' },
      { label: 'MAC 可识别', detail: '格式校验通过', state: 'pass' },
      { label: '资料无重复', detail: '检测到重复资料', state: 'fail' },
    ],
  },
]

const currentIndex = ref(0)
const currentImageIndex = ref(0)
const note = ref('')
const syncing = ref(false)
const result = ref(null)
const savedResults = ref({})
const imageZoomed = ref(false)
let revealTimer

const current = computed(() => records[currentIndex.value])
const currentImage = computed(() => current.value.images[currentImageIndex.value])
const allChecksPassed = computed(() => current.value.checks.every((item) => item.state === 'pass'))
const processedCount = computed(() => Object.keys(savedResults.value).length)
const passedCount = computed(() => Object.values(savedResults.value).filter((item) => item.result === '通过').length)
const failedCount = computed(() => processedCount.value - passedCount.value)
const progress = computed(() => Math.round((processedCount.value / records.length) * 100))

function selectImage(index) {
  currentImageIndex.value = index
  imageZoomed.value = false
}

function showRecord(index) {
  if (syncing.value || index < 0 || index >= records.length) return
  currentIndex.value = index
  currentImageIndex.value = 0
  imageZoomed.value = false
  result.value = null
  note.value = savedResults.value[records[index].id]?.note || ''
}

function goNext() {
  showRecord(Math.min(currentIndex.value + 1, records.length - 1))
}

function goPrevious() {
  showRecord(Math.max(currentIndex.value - 1, 0))
}

async function saveDecision(decision) {
  if (syncing.value) return

  syncing.value = true
  result.value = null

  // 初版先模拟飞书写入；接入后替换为实际接口请求。
  await new Promise((resolve) => window.setTimeout(resolve, 720))

  savedResults.value = {
    ...savedResults.value,
    [current.value.id]: {
      result: decision,
      time: new Date().toISOString(),
      note: note.value.trim(),
    },
  }
  syncing.value = false
  result.value = decision

  window.clearTimeout(revealTimer)
  revealTimer = window.setTimeout(async () => {
    if (currentIndex.value < records.length - 1) {
      currentIndex.value += 1
      currentImageIndex.value = 0
      note.value = savedResults.value[records[currentIndex.value].id]?.note || ''
      imageZoomed.value = false
      await nextTick()
      result.value = null
    }
  }, 1500)
}

onBeforeUnmount(() => window.clearTimeout(revealTimer))
</script>

<template>
  <main class="screening-page">
    <div class="screening-ambient" aria-hidden="true"></div>

    <header class="screening-topbar">
      <div class="screening-brand">
        <div class="brand-orbit" aria-hidden="true"><span>鲲</span></div>
        <div>
          <strong>鲲鹏 CPE 直播初筛</strong>
          <small>KUNPENG · LIVE SCREENING</small>
        </div>
      </div>

      <div class="live-indicator">
        <i aria-hidden="true"></i>
        直播筛选中
      </div>

      <div class="screening-progress">
        <div>
          <span>本场进度</span>
          <strong>{{ processedCount }} <small>/ {{ records.length }}</small></strong>
        </div>
        <div class="progress-track" aria-hidden="true">
          <span :style="{ width: `${progress}%` }"></span>
        </div>
      </div>
    </header>

    <section class="screening-stage">
      <div class="image-panel">
        <div class="image-panel-head">
          <div>
            <span class="section-index">01</span>
            <div>
              <small>ORIGINAL SUBMISSION</small>
              <strong>申请资料原图</strong>
            </div>
          </div>
          <span class="original-badge">原图展示 · 未裁剪</span>
        </div>

        <div class="image-viewer" :class="{ 'is-zoomed': imageZoomed }">
          <button
            class="image-canvas"
            type="button"
            :aria-label="imageZoomed ? '缩小原图' : '放大原图'"
            @click="imageZoomed = !imageZoomed"
          >
            <span class="image-grid" aria-hidden="true"></span>
            <img :src="currentImage.src" :alt="currentImage.label" />
            <span class="zoom-hint">{{ imageZoomed ? '点击恢复' : '点击放大' }}</span>
          </button>
          <div class="image-caption">
            <span>{{ currentImage.label }}</span>
            <span>{{ currentImageIndex + 1 }} / {{ current.images.length }}</span>
          </div>
        </div>

        <div v-if="current.images.length > 1" class="image-strip" aria-label="原图列表">
          <button
            v-for="(image, index) in current.images"
            :key="image.src"
            type="button"
            :class="{ active: currentImageIndex === index }"
            @click="selectImage(index)"
          >
            <img :src="image.src" :alt="image.label" />
            <span>原图 {{ index + 1 }}</span>
          </button>
        </div>
      </div>

      <aside class="review-panel">
        <div class="candidate-card">
          <span class="section-index">02</span>
          <div class="candidate-title">
            <small>CURRENT APPLICATION</small>
            <span>当前申请</span>
          </div>
          <div class="candidate-identity">
            <div class="candidate-avatar">{{ current.nickname.slice(0, 1) }}</div>
            <div>
              <h1>{{ current.nickname }}</h1>
              <p>{{ current.id }} · 提交于 {{ current.submittedAt }}</p>
            </div>
          </div>
          <div class="record-switcher">
            <button type="button" :disabled="currentIndex === 0 || syncing" @click="goPrevious">
              ← 上一位
            </button>
            <span>{{ String(currentIndex + 1).padStart(2, '0') }}</span>
            <button type="button" :disabled="currentIndex === records.length - 1 || syncing" @click="goNext">
              下一位 →
            </button>
          </div>
        </div>

        <div class="checks-card">
          <div class="checks-heading">
            <div>
              <span class="section-index">03</span>
              <strong>技术核验</strong>
            </div>
            <span :class="allChecksPassed ? 'checks-ready' : 'checks-review'">
              {{ allChecksPassed ? '全部符合' : '存在异常' }}
            </span>
          </div>

          <ul class="checks-list">
            <li
              v-for="(item, index) in current.checks"
              :key="item.label"
              :class="`is-${item.state}`"
            >
              <span class="check-number">0{{ index + 1 }}</span>
              <div>
                <strong>{{ item.label }}</strong>
                <small>{{ item.detail }}</small>
              </div>
              <i aria-hidden="true">{{ item.state === 'pass' ? '✓' : '!' }}</i>
            </li>
          </ul>
        </div>

        <div class="summary-card">
          <div><span>已通过</span><strong>{{ passedCount }}</strong></div>
          <i></i>
          <div><span>未通过</span><strong>{{ failedCount }}</strong></div>
          <i></i>
          <div><span>待筛选</span><strong>{{ records.length - processedCount }}</strong></div>
        </div>
      </aside>
    </section>

    <footer class="decision-bar">
      <button
        class="decision-button decision-reject"
        type="button"
        :disabled="syncing"
        @click="saveDecision('不通过')"
      >
        <span>×</span>
        <div><strong>不通过</strong><small>REJECT</small></div>
      </button>

      <label class="note-field">
        <span>直播筛选备注</span>
        <textarea
          v-model="note"
          maxlength="120"
          rows="2"
          placeholder="填写简短审核说明（请勿输入手机号、MAC 等敏感信息）"
          :disabled="syncing"
        ></textarea>
        <small>{{ note.length }} / 120</small>
      </label>

      <button
        class="decision-button decision-pass"
        type="button"
        :disabled="syncing"
        @click="saveDecision('通过')"
      >
        <span>✓</span>
        <div><strong>通过</strong><small>APPROVE</small></div>
      </button>
    </footer>

    <Transition name="result-reveal">
      <div v-if="syncing || result" class="result-overlay" :class="result === '通过' ? 'is-pass' : 'is-reject'">
        <div v-if="syncing" class="syncing-state">
          <span class="sync-spinner"></span>
          <small>正在同步至飞书表格</small>
          <strong>保存筛选结果</strong>
        </div>
        <div v-else class="result-state">
          <span>{{ result === '通过' ? '✓' : '×' }}</span>
          <small>LIVE SCREENING RESULT</small>
          <strong>{{ result }}</strong>
          <p>结果已同步 · 即将进入下一位</p>
        </div>
      </div>
    </Transition>
  </main>
</template>
