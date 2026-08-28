<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

const STORAGE_KEY = 'qixi-battle-stage-v2'

const contestants = [
  { id: 1, name: '胡乱蹿儿', group: 1 },
  { id: 2, name: '吃饱了撑着', group: 1 },
  { id: 3, name: '九月的彩虹', group: 1 },
  { id: 4, name: '～☆清心☆～', group: 1 },
  { id: 5, name: 'le 嘉', group: 1 },
  { id: 6, name: '白灰黑', group: 1 },
  { id: 7, name: 'Xhh', group: 1 },
  { id: 8, name: '初见。', group: 1 },
  { id: 9, name: '🎆🎆AddictionJack', group: 1 },
  { id: 10, name: '晓辉', group: 1 },
  { id: 11, name: 'Tesla', group: 2 },
  { id: 12, name: '🌈熱爱生活🌈', group: 2 },
  { id: 13, name: '啊彬', group: 2 },
  { id: 14, name: 'Holy', group: 2 },
  { id: 15, name: '（）', group: 2 },
  { id: 16, name: '雨沐云', group: 2 },
  { id: 17, name: '西奈灌饼', group: 2 },
  { id: 18, name: '哈', group: 2 },
  { id: 19, name: '🌈每天都开心🥳', group: 2 },
  { id: 20, name: '星海', group: 2 },
]

const eliminatedIds = ref(new Set())
const winnerId = ref(null)
const phase = ref('groups')
const history = ref([])
const showResetDialog = ref(false)
const notice = ref('')
const cursorAura = ref(null)
const cursorVisible = ref(false)
const hearts = ref([])
let noticeTimer = 0
let pointerFrame = 0
let pointerX = 0
let pointerY = 0
let lastHeartAt = 0
let nextHeartId = 1
const heartTimers = new Set()
const groups = [1, 2].map((number) => ({
  number,
  label: `第${number === 1 ? '一' : '二'}组`,
  members: contestants.filter((person) => person.group === number),
}))

const totalEliminated = computed(() => eliminatedIds.value.size)
const finalists = computed(() => contestants.filter((person) => !eliminatedIds.value.has(person.id)))
const groupsReady = computed(() => groups.every((group) => groupEliminatedCount(group) === 2))
const champion = computed(() => phase.value === 'final'
  ? finalists.value.find((person) => person.id === winnerId.value) || null
  : null)

function groupEliminatedCount(group) {
  return group.members.filter((person) => eliminatedIds.value.has(person.id)).length
}

const graphemeSegmenter = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('zh-CN', { granularity: 'grapheme' })
  : null

function nameSizeClass(name) {
  const graphemes = graphemeSegmenter
    ? [...graphemeSegmenter.segment(name)].map(({ segment }) => segment)
    : Array.from(name)
  const displayUnits = graphemes.reduce((total, segment) => {
    if (/\p{Extended_Pictographic}/u.test(segment)) return total + 1.2
    if (/^[\x00-\xff]+$/.test(segment)) return total + 0.58
    return total + 1
  }, 0)

  if (displayUnits > 9) return 'name-compact'
  if (displayUnits > 6.2) return 'name-medium'
  return 'name-regular'
}

function snapshot() {
  return {
    eliminatedIds: [...eliminatedIds.value],
    winnerId: winnerId.value,
    phase: phase.value,
  }
}

function remember() {
  history.value = [...history.value.slice(-29), snapshot()]
}

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    ...snapshot(),
    history: history.value,
  }))
}

function flash(message) {
  notice.value = message
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => { notice.value = '' }, 2600)
}

function toggleEliminated(person, group) {
  const next = new Set(eliminatedIds.value)
  if (next.has(person.id)) {
    remember()
    next.delete(person.id)
  } else if (groupEliminatedCount(group) < 2) {
    remember()
    next.add(person.id)
  } else {
    flash(`${group.label}已经淘汰 2 人，可先点亮一人再修改。`)
    return
  }
  eliminatedIds.value = next
  winnerId.value = null
  persist()
}

function enterFinal() {
  if (phase.value === 'final') return
  if (!groupsReady.value) {
    flash('两组各淘汰 2 人后，才能开启十六强决赛。')
    return
  }
  remember()
  phase.value = 'final'
  winnerId.value = null
  persist()
  nextTick(() => {
    document.querySelector('.qixi-final-grid')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  })
}

function editGroups() {
  remember()
  phase.value = 'groups'
  winnerId.value = null
  persist()
  window.scrollTo({ top: document.querySelector('.qixi-stage')?.offsetTop || 0, behavior: 'smooth' })
}

function selectWinner(person) {
  remember()
  winnerId.value = winnerId.value === person.id ? null : person.id
  persist()
}

function undo() {
  const previous = history.value.at(-1)
  if (!previous) return
  history.value = history.value.slice(0, -1)
  eliminatedIds.value = new Set(previous.eliminatedIds)
  winnerId.value = previous.winnerId || null
  phase.value = previous.phase
  persist()
  flash('已撤销上一步操作。')
}

function resetAll() {
  eliminatedIds.value = new Set()
  winnerId.value = null
  phase.value = 'groups'
  history.value = []
  showResetDialog.value = false
  window.localStorage.removeItem(STORAGE_KEY)
  flash('赛程已经重新开始。')
}

function restore() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
    if (!saved) return
    const validIds = new Set(contestants.map((person) => person.id))
    const savedGroups = (saved.eliminatedIds || []).filter((id) => validIds.has(id))
    const validGroupResult = groups.every((group) => savedGroups.filter((id) => group.members.some((person) => person.id === id)).length <= 2)
    if (!validGroupResult) return
    eliminatedIds.value = new Set(savedGroups)
    const finalistIds = new Set(finalists.value.map((person) => person.id))
    winnerId.value = finalistIds.has(saved.winnerId) ? saved.winnerId : null
    phase.value = saved.phase === 'final' && savedGroups.length === 4 ? 'final' : 'groups'
    history.value = Array.isArray(saved.history) ? saved.history.slice(-30) : []
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
  }
}

restore()

function addHeart(x, y) {
  const id = nextHeartId++
  const drift = Math.round((Math.random() - 0.5) * 120)
  const duration = Math.round(950 + Math.random() * 650)
  const symbols = ['♥', '❤', '♡']
  hearts.value = [...hearts.value.slice(-27), {
    id,
    x,
    y,
    drift,
    burstX: Math.round(drift * -.28),
    duration,
    size: Math.round(13 + Math.random() * 15),
    spin: Math.round((Math.random() - 0.5) * 110),
    symbol: symbols[id % symbols.length],
  }]

  const timer = window.setTimeout(() => {
    hearts.value = hearts.value.filter((heart) => heart.id !== id)
    heartTimers.delete(timer)
  }, duration + 80)
  heartTimers.add(timer)
}

function handlePointerMove(event) {
  if (event.pointerType === 'touch') return
  pointerX = event.clientX
  pointerY = event.clientY
  cursorVisible.value = true

  if (!pointerFrame) {
    pointerFrame = window.requestAnimationFrame(() => {
      cursorAura.value?.style.setProperty('transform', `translate3d(${pointerX}px, ${pointerY}px, 0)`)
      pointerFrame = 0
    })
  }

  const card = event.target.closest?.('.qixi-person, .qixi-finalist')
  if (card) {
    const bounds = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${event.clientX - bounds.left}px`)
    card.style.setProperty('--my', `${event.clientY - bounds.top}px`)
  }

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const now = performance.now()
  if (now - lastHeartAt < 58) return
  lastHeartAt = now
  addHeart(event.clientX, event.clientY)
}

function hideCursorEffects() {
  cursorVisible.value = false
}

onMounted(() => {
  window.addEventListener('pointermove', handlePointerMove, { passive: true })
  document.addEventListener('mouseleave', hideCursorEffects)
  window.addEventListener('blur', hideCursorEffects)
})

onUnmounted(() => {
  window.removeEventListener('pointermove', handlePointerMove)
  document.removeEventListener('mouseleave', hideCursorEffects)
  window.removeEventListener('blur', hideCursorEffects)
  if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
  heartTimers.forEach((timer) => window.clearTimeout(timer))
})
</script>

<template>
  <main class="qixi-page">
    <div class="qixi-stars" aria-hidden="true"></div>
    <div ref="cursorAura" class="qixi-cursor-aura" :class="{ visible: cursorVisible }" aria-hidden="true"></div>
    <div class="qixi-heart-rain" aria-hidden="true">
      <span
        v-for="heart in hearts"
        :key="heart.id"
        class="qixi-heart"
        :style="{
          left: `${heart.x}px`,
          top: `${heart.y}px`,
          fontSize: `${heart.size}px`,
          '--drift': `${heart.drift}px`,
          '--burst-x': `${heart.burstX}px`,
          '--spin': `${heart.spin}deg`,
          '--duration': `${heart.duration}ms`,
        }"
      >{{ heart.symbol }}</span>
    </div>

    <nav class="qixi-toolbar" aria-label="赛程操作">
      <div class="qixi-steps">
        <button type="button" :class="{ active: phase === 'groups' }" @click="phase === 'final' ? editGroups() : null">
          <span>01</span> 分组淘汰
        </button>
        <i></i>
        <button type="button" :class="{ active: phase === 'final' }" :disabled="!groupsReady" @click="enterFinal">
          <span>02</span> 十六强决赛
        </button>
      </div>
      <div class="qixi-tools">
        <button type="button" :disabled="history.length === 0" @click="undo">↶ 撤销</button>
        <button type="button" @click="showResetDialog = true">重新开始</button>
      </div>
    </nav>

    <section v-if="phase === 'groups'" class="qixi-stage" aria-labelledby="group-stage-title">
      <header class="qixi-section-heading">
        <div>
          <span>ROUND 01</span>
          <h2 id="group-stage-title">分组淘汰赛</h2>
        </div>
        <p>实体转盘每组抽出 2 人淘汰 · 点击对应昵称记录结果</p>
      </header>

      <div class="qixi-groups">
        <article v-for="group in groups" :key="group.number" class="qixi-group-card">
          <header>
            <small class="qixi-group-label">GROUP 0{{ group.number }}</small>
            <strong :class="{ complete: groupEliminatedCount(group) === 2 }">
              {{ groupEliminatedCount(group) }} / 2 已淘汰
            </strong>
          </header>

          <div class="qixi-roster">
            <button
              v-for="(person, index) in group.members"
              :key="person.id"
              type="button"
              class="qixi-person"
              :class="{ eliminated: eliminatedIds.has(person.id) }"
              :aria-pressed="eliminatedIds.has(person.id)"
              @click="toggleEliminated(person, group)"
            >
              <span class="qixi-number">{{ index + 1 }}</span>
              <span class="qixi-name" :class="nameSizeClass(person.name)">{{ person.name }}</span>
              <span v-if="eliminatedIds.has(person.id)" class="qixi-mark">已淘汰</span>
            </button>
          </div>
        </article>
      </div>

      <div class="qixi-advance" :class="{ unlocked: groupsReady }">
        <div>
          <span>{{ groupsReady ? 'QUALIFIERS CONFIRMED' : 'WAITING FOR THE WHEEL' }}</span>
          <h3>{{ groupsReady ? '十六位选手，已经集结。' : `还需淘汰 ${4 - totalEliminated} 人` }}</h3>
          <p>{{ groupsReady ? '确认名单后将重新编号 01–16，进入最终角逐。' : '请根据实体大转盘结果，点击对应昵称标记淘汰。' }}</p>
        </div>
        <button type="button" :disabled="!groupsReady" @click="enterFinal">
          开启十六强决赛 <span>→</span>
        </button>
      </div>
    </section>

    <section v-else class="qixi-stage qixi-final-stage" :class="{ 'has-champion': champion }" aria-labelledby="final-stage-title">
      <header class="qixi-section-heading qixi-final-heading">
        <div>
          <span>ROUND 02 · THE FINAL BATTLE</span>
          <h2 id="final-stage-title">十六强 · 终局之战</h2>
        </div>
        <p>实体转盘最终抽中一人 · 点击昵称加冕冠军</p>
      </header>

      <div v-if="champion" class="qixi-champion" role="status">
        <span>✦ THE ONE AND ONLY ✦</span>
        <small>今夜不再寂寞</small>
        <strong>{{ champion.name }}</strong>
        <p>十六选一，一次定胜负。七夕命运之轮的最终胜者。</p>
      </div>

      <div class="qixi-final-lockup" aria-label="十六选一">
        <div class="qixi-final-count">
          <strong>16</strong>
          <span>FINALISTS</span>
        </div>
        <div class="qixi-final-strike">
          <i></i>
          <strong>一轮定胜负</strong>
          <small>实体转盘 · 终局开启</small>
          <i></i>
        </div>
        <div class="qixi-final-count winner-count">
          <strong>1</strong>
          <span>WINNER</span>
        </div>
      </div>

      <div class="qixi-final-grid">
        <button
          v-for="(person, index) in finalists"
          :key="person.id"
          type="button"
          class="qixi-finalist"
          :class="{
            champion: champion?.id === person.id,
          }"
          :style="{ '--i': index }"
          :aria-pressed="champion?.id === person.id"
          @click="selectWinner(person)"
        >
          <span class="qixi-final-number">{{ index + 1 }}</span>
          <strong :class="nameSizeClass(person.name)">{{ person.name }}</strong>
          <small v-if="champion?.id === person.id">今夜冠军</small>
        </button>
      </div>

      <button class="qixi-edit-groups" type="button" @click="editGroups">← 返回修改分组赛结果</button>
    </section>

    <Transition name="qixi-toast">
      <div v-if="notice" class="qixi-notice" role="status">{{ notice }}</div>
    </Transition>

    <Transition name="qixi-modal">
      <div v-if="showResetDialog" class="qixi-modal-backdrop" @click.self="showResetDialog = false">
        <section class="qixi-modal" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <span>RESET THE NIGHT</span>
          <h2 id="reset-title">重新开始整场角逐？</h2>
          <p>所有分组淘汰和决赛记录都会清空，20 人恢复到初始状态。</p>
          <div>
            <button type="button" @click="showResetDialog = false">取消</button>
            <button type="button" class="danger" @click="resetAll">确认重新开始</button>
          </div>
        </section>
      </div>
    </Transition>

  </main>
</template>
