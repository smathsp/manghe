<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import './screening.css'

function buildQuestionGroups({
  model,
  publicTest,
  activity,
  reason,
  message,
}) {
  return [
    {
      id: 'device',
      label: '设备经历',
      questions: [
        { number: 5, question: '你是否用过 5G 随身 WiFi / CPE 产品？', answer: '用过' },
        { number: 6, question: '你是否有鲲鹏 5G CPE 产品？', answer: '有' },
        { number: 7, question: '你用过谁家的 5G 产品？', answer: '鲲鹏、华为' },
        { number: 9, question: '你有鲲鹏的哪些 5G CPE 产品？', answer: model, imageIndex: 0 },
        { number: 11, question: '你是否用过鲲鹏的流量卡？', answer: '用过' },
      ],
    },
    {
      id: 'contribution',
      label: '参与贡献',
      questions: [
        { number: 13, question: '你是否参加过鲲鹏产品的内测或公测活动？', answer: '参加过' },
        { number: 14, question: '你参加过哪些鲲鹏产品的内测或公测活动？', answer: publicTest },
        { number: 15, question: '你参加过鲲鹏产品的种草活动？', answer: '参加过', imageIndex: 1, imageLabel: '发布作品截图' },
        { number: 17, question: '你是否给鲲鹏团队反馈过问题帮助优化产品？', answer: '反馈过', imageIndex: 2, imageLabel: '问题反馈沟通截图' },
        { number: 19, question: '你是否给身边的朋友推荐过鲲鹏的产品？', answer: '推荐过', imageIndex: 3, imageLabel: '推荐证明截图' },
        { number: 21, question: '你是否在其他媒体渠道发布过鲲鹏产品的开箱内容？', answer: activity, imageIndex: 4, imageLabel: '开箱内容截图' },
      ],
    },
    {
      id: 'fan',
      label: '粉丝互动',
      questions: [
        { number: 23, question: '你是否观看鲲鹏张导抖音的直播？', answer: '经常观看', imageIndex: 5, imageLabel: '鲲鹏张导粉丝灯牌截图' },
        { number: 25, question: '你是否观看张导严选抖音号的直播？', answer: '经常观看', imageIndex: 6, imageLabel: '张导严选粉丝灯牌截图' },
        { number: 27, question: '你是否有注册张导严选小店？', answer: '已注册', imageIndex: 7, imageLabel: '张导的店会员等级截图' },
      ],
    },
    {
      id: 'story',
      label: '申请表达',
      questions: [
        { number: 30, question: '你为什么需要天火卡？', answer: reason, long: true },
        { number: 31, question: '留下你想对张导说的话', answer: message, long: true },
      ],
    },
  ]
}

const sharedEvidence = [
  { src: '/images/C5800-688.png', label: 'Q09 · 鲲鹏 CPE 产品原图' },
  { src: '/images/C5800-688-result.png', label: 'Q16 · 发布作品截图' },
  { src: '/activation/figure-01.jpg', label: 'Q18 · 问题反馈沟通截图' },
  { src: '/activation/figure-04.jpg', label: 'Q20 · 推荐证明截图' },
  { src: '/activation/figure-05.jpg', label: 'Q22 · 开箱内容截图' },
  { src: '/activation/figure-08.jpg', label: 'Q24 · 鲲鹏张导粉丝灯牌截图' },
  { src: '/activation/figure-09.jpg', label: 'Q26 · 张导严选粉丝灯牌截图' },
  { src: '/activation/figure-10.jpg', label: 'Q29 · 张导的店会员等级截图' },
]

const records = [
  {
    id: 'KP-2026-0047',
    nickname: '山海之间',
    submittedAt: '07-27 10:42',
    images: sharedEvidence,
    groups: buildQuestionGroups({
      model: 'C5800-688、C2000MAX',
      publicTest: 'C5800-688 公测、AK68-798 内测',
      activity: '发布过 3 条鲲鹏产品开箱内容',
      reason: '平时经常进行户外直播，现有流量套餐不够稳定，希望天火卡能成为直播时的主力网络。',
      message: '感谢张导和团队这些年持续听取用户意见。希望鲲鹏越做越好，也祝十周年活动顺利！',
    }),
  },
  {
    id: 'KP-2026-0048',
    nickname: '小满',
    submittedAt: '07-27 10:45',
    images: sharedEvidence.map((image, index) => index === 0
      ? { src: '/images/C2000PRO+.png', label: 'Q09 · 鲲鹏 CPE 产品原图' }
      : image),
    groups: buildQuestionGroups({
      model: 'C2000PRO+、AK68-798',
      publicTest: 'C2000 系列公测、鲲鹏流量卡体验活动',
      activity: '在抖音和小红书发布过开箱与测速内容',
      reason: '需要在房车旅行和户外工作时保持稳定连接，天火卡的大流量和高上行很适合我的使用场景。',
      message: '从第一台鲲鹏设备开始一直用到现在，谢谢团队认真对待每一次反馈。',
    }),
  },
  {
    id: 'KP-2026-0049',
    nickname: '白昼星河',
    submittedAt: '07-27 10:51',
    images: sharedEvidence.map((image, index) => index === 0
      ? { src: '/images/NBCPE-688.png', label: 'Q09 · 鲲鹏 CPE 产品原图' }
      : image),
    groups: buildQuestionGroups({
      model: 'NBCPE-688、C8-788',
      publicTest: 'NBCPE-688 内测、C8-788 公测',
      activity: '长期分享设备使用技巧和不同场景的网络表现',
      reason: '有电竞直播和远程工作的需求，希望获得稳定的大流量网络，减少直播中断和延迟。',
      message: '十年很不容易，感谢张导一直坚持做真正解决用户问题的产品，期待下一个十年。',
    }),
  },
]

const currentIndex = ref(0)
const note = ref('')
const syncing = ref(false)
const result = ref(null)
const savedResults = ref({})
const lightboxImage = ref(null)
let revealTimer

const current = computed(() => records[currentIndex.value])
const processedCount = computed(() => Object.keys(savedResults.value).length)
const progress = computed(() => Math.round((processedCount.value / records.length) * 100))

function openEvidence(question) {
  if (question.imageIndex === undefined) return
  lightboxImage.value = current.value.images[question.imageIndex]
}

function closeEvidence() {
  lightboxImage.value = null
}

function showRecord(index) {
  if (syncing.value || index < 0 || index >= records.length) return
  currentIndex.value = index
  lightboxImage.value = null
  result.value = null
  note.value = savedResults.value[records[index].id]?.note || ''
  document.querySelector('.screening-content')?.scrollTo({ top: 0, behavior: 'smooth' })
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
      note.value = savedResults.value[records[currentIndex.value].id]?.note || ''
      lightboxImage.value = null
      await nextTick()
      document.querySelector('.screening-content')?.scrollTo({ top: 0 })
      result.value = null
    }
  }, 1500)
}

onBeforeUnmount(() => window.clearTimeout(revealTimer))
</script>

<template>
  <main class="screening-page screening-page-vertical">
    <div class="screening-ambient" aria-hidden="true"></div>

    <header class="screening-topbar vertical-topbar">
      <div class="screening-brand">
        <div class="brand-orbit" aria-hidden="true"><span>鲲</span></div>
        <div>
          <strong>天火卡直播筛选</strong>
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

    <div class="screening-content">
      <div class="vertical-shell">
        <section class="applicant-hero">
          <div class="applicant-number">
            <span>CURRENT APPLICATION</span>
            <strong>{{ String(currentIndex + 1).padStart(2, '0') }}</strong>
          </div>

          <div class="applicant-main">
            <div class="candidate-avatar">{{ current.nickname.slice(0, 1) }}</div>
            <div>
              <span class="precheck-badge">已通过初筛</span>
              <h1>{{ current.nickname }}</h1>
              <p>{{ current.id }} · 提交于 {{ current.submittedAt }}</p>
            </div>
          </div>

          <div class="vertical-record-switcher">
            <button type="button" :disabled="currentIndex === 0 || syncing" @click="goPrevious">
              <span>←</span> 上一位
            </button>
            <button type="button" :disabled="currentIndex === records.length - 1 || syncing" @click="goNext">
              下一位 <span>→</span>
            </button>
          </div>
        </section>

        <div class="privacy-banner">
          <span aria-hidden="true">●</span>
          直播画面已隐藏手机号、微信号、抖音 ID、MAC、ICCID 等敏感字段
        </div>

        <section
          v-for="(group, groupIndex) in current.groups"
          :key="group.id"
          class="qa-section"
        >
          <header class="qa-section-heading">
            <div>
              <span>0{{ groupIndex + 1 }}</span>
              <div>
                <small>APPLICATION RESPONSES</small>
                <h2>{{ group.label }}</h2>
              </div>
            </div>
            <strong>{{ group.questions.length }} 项回答</strong>
          </header>

          <div class="qa-stack">
            <article
              v-for="item in group.questions"
              :key="item.number"
              class="qa-entry"
              :class="{ 'is-story': item.long, 'has-evidence': item.imageIndex !== undefined }"
            >
              <div class="qa-copy">
                <span class="qa-number">Q{{ String(item.number).padStart(2, '0') }}</span>
                <div>
                  <h3>{{ item.question }}</h3>
                  <p>{{ item.answer }}</p>
                </div>
              </div>

              <button
                v-if="item.imageIndex !== undefined"
                class="inline-evidence"
                type="button"
                :aria-label="`全屏查看${current.images[item.imageIndex].label}`"
                @click="openEvidence(item)"
              >
                <img
                  :src="current.images[item.imageIndex].src"
                  :alt="current.images[item.imageIndex].label"
                  loading="lazy"
                />
                <span class="evidence-caption">
                  <span>
                    <small>ORIGINAL IMAGE</small>
                    <strong>{{ item.imageLabel || current.images[item.imageIndex].label }}</strong>
                  </span>
                  <em>查看原图 ↗</em>
                </span>
              </button>
            </article>
          </div>
        </section>

        <div class="content-end">
          <span>END OF APPLICATION</span>
          <p>以上为当前申请人的直播展示内容</p>
        </div>
      </div>
    </div>

    <footer class="decision-bar vertical-decision-bar">
      <div class="decision-reject-column">
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
            placeholder="填写不通过原因或其他审核说明"
            :disabled="syncing"
          ></textarea>
          <small>{{ note.length }} / 120</small>
        </label>
      </div>

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
      <div
        v-if="lightboxImage"
        class="image-lightbox"
        role="dialog"
        aria-modal="true"
        :aria-label="lightboxImage.label"
        @click.self="closeEvidence"
      >
        <div class="lightbox-head">
          <div>
            <small>ORIGINAL IMAGE</small>
            <strong>{{ lightboxImage.label }}</strong>
          </div>
          <button type="button" aria-label="关闭原图" @click="closeEvidence">×</button>
        </div>
        <img :src="lightboxImage.src" :alt="lightboxImage.label" />
        <p>点击空白处关闭</p>
      </div>
    </Transition>

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
