<script setup>
import { computed, ref } from 'vue'

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
  { id: 15, name: '（　　　　　　　　）', group: 2 },
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
let noticeTimer = 0
const groups = [1, 2].map((number) => ({
  number,
  title: number === 1 ? '银河组' : '鹊桥组',
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
    flash(`${group.title}已经淘汰 2 人，可先点亮一人再修改。`)
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
  window.scrollTo({ top: 0, behavior: 'smooth' })
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
</script>

<template>
  <main class="qixi-page">
    <div class="qixi-stars" aria-hidden="true"></div>
    <header class="qixi-hero">
      <a class="qixi-home" href="/">KP / QIXI 2026</a>
      <div class="qixi-knot" aria-hidden="true"><span><b>七</b></span><i></i><span><b>夕</b></span></div>
      <p class="qixi-eyebrow">THE NIGHT OF DESTINY · 七夕特别企划</p>
      <h1>七夕<br><em>角逐寂寞</em></h1>
      <p class="qixi-lead">二十颗星落入银河。转动命运之轮，留下今晚的十六位决赛者。</p>
      <div class="qixi-scoreboard" aria-label="赛程统计">
        <span><b>20</b><small>初始选手</small></span>
        <i></i>
        <span><b>{{ totalEliminated }}</b><small>分组淘汰</small></span>
        <i></i>
        <span><b>{{ finalists.length }}</b><small>{{ phase === 'groups' ? '当前晋级' : '决赛选手' }}</small></span>
      </div>
    </header>

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
            <div>
              <small>GROUP 0{{ group.number }}</small>
              <h3>{{ group.title }}</h3>
            </div>
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
              <span class="qixi-number">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="qixi-name">{{ person.name }}</span>
              <span class="qixi-mark">{{ eliminatedIds.has(person.id) ? '已淘汰' : '在场' }}</span>
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

    <section v-else class="qixi-stage qixi-final-stage" aria-labelledby="final-stage-title">
      <header class="qixi-section-heading qixi-final-heading">
        <div>
          <span>ROUND 02 · FINAL</span>
          <h2 id="final-stage-title">十六强命运决赛</h2>
        </div>
        <p>决赛编号已重新生成 · 实体转盘最终抽中一人，点击昵称确认冠军</p>
      </header>

      <div v-if="champion" class="qixi-champion" role="status">
        <span>✦ THE ONE AND ONLY ✦</span>
        <small>今夜不再寂寞</small>
        <strong>{{ champion.name }}</strong>
        <p>十六选一，一次定胜负。七夕命运之轮的最终胜者。</p>
      </div>

      <div class="qixi-final-summary">
        <div><span>16</span><small>决赛起始</small></div>
        <i></i>
        <div><span>1</span><small>最终名额</small></div>
        <i></i>
        <div><span>{{ champion ? 1 : 0 }}</span><small>冠军已定</small></div>
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
          :aria-pressed="champion?.id === person.id"
          @click="selectWinner(person)"
        >
          <span class="qixi-final-number">{{ String(index + 1).padStart(2, '0') }}</span>
          <strong>{{ person.name }}</strong>
          <small>{{ champion?.id === person.id ? '今夜冠军' : '等待命运' }}</small>
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

    <footer class="qixi-footer">
      <span>鲲鹏张导 · 七夕特别企划</span>
      <span>愿今夜，被命运选中的人都不再寂寞。</span>
    </footer>
  </main>
</template>
