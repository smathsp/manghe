<script setup>
import { computed, onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import Papa from 'papaparse'
import './blindbox-review.css'

const STORAGE_KEY = 'blindbox-exchange-decisions-v4'

const csvFile = ref(null)
const importState = ref('idle')
const importMessage = ref('')
const allRecords = ref([])
const currentIndex = ref(0)
const decisions = ref({})
const notes = ref({})
const reviewNote = ref('')
const revealResult = ref(null)
let decisionTimer = null

const COL = {
  number: '编号', nickname: '抖音昵称', boxNumber: '中盲盒的号码',
  opener: '谁给你开的盲盒', rarity: '盲盒稀有度',
  satisfaction: '你对自己中的盲盒满意吗？',
  msgToOpener: '你想对给你开盲盒的同学说什么？',
  enjoyment: '这次盲盒你玩的开心吗？',
  anniversary: '你有什么想对鲲鹏十周年庆说的话？',
  msgToZhang: '你有什么想对张导说的话？',
  suggestion: '你有什么好的建议给鲲鹏团队，未来还可以玩什么有趣的游戏？',
  legendary: '金色传说', epic: '紫色韵味', common: '蓝瘦香菇',
  action: '你打算怎么处理你的盲盒，置换还是直接获取？',
  exchangeNote: '你打算怎么处理你的盲盒，置换还是直接获取？-置换-补充内容',
}

function norm(v) { return v == null ? '' : String(v).trim() }
function prize(row) { return norm(row[COL.legendary]) || norm(row[COL.epic]) || norm(row[COL.common]) || '未识别' }
function isExchange(r) { return r.action === '置换' }

function redact(text) {
  let t = String(text || '')
  // Phone numbers (11-digit Chinese mobile)
  t = t.replace(/\b1[3-9]\d{9}\b/g, '[手机号已隐藏]')
  // ICCID (starts with 89, 18-20 digits)
  t = t.replace(/\b89\d{17,18}\b/g, '[ICCID已隐藏]')
  // WeChat IDs
  t = t.replace(/\bwxid_[a-z0-9_]+\b/gi, '[微信号已隐藏]')
  // MAC addresses
  t = t.replace(/\b(?:[0-9a-f]{2}[:-]?){5}[0-9a-f]{2}\b/gi, '[MAC已隐藏]')
  return t
}

const current = computed(() => allRecords.value[currentIndex.value] || null)
const totalCount = computed(() => allRecords.value.length)
const exchangeCount = computed(() => allRecords.value.filter(isExchange).length)
const decidedCount = computed(() => Object.keys(decisions.value).length)
const approveCount = computed(() => Object.values(decisions.value).filter(d => d === 'approve').length)
const rejectCount = computed(() => Object.values(decisions.value).filter(d => d === 'reject').length)
const currentDecision = computed(() => current.value ? decisions.value[current.value.id] : null)

async function importCsv() {
  if (!csvFile.value || importState.value === 'loading') return
  importState.value = 'loading'
  importMessage.value = '解析中…'
  try {
    const text = await csvFile.value.text()
    const { data, errors } = await new Promise(r => Papa.parse(text, { header: true, skipEmptyLines: 'greedy', complete: r }))
    if ((errors || []).filter(e => e.type === 'Quotes').length) throw new Error('CSV 格式错误')
    const records = data
      .filter(row => norm(row[COL.number]) && norm(row[COL.nickname]))
      .map((row, i) => ({
        id: norm(row[COL.number]),
        name: norm(row[COL.nickname]),
        boxNumber: norm(row[COL.boxNumber]),
        opener: norm(row[COL.opener]),
        rarity: norm(row[COL.rarity]),
        satisfaction: norm(row[COL.satisfaction]),
        msgToOpener: redact(norm(row[COL.msgToOpener])),
        enjoyment: norm(row[COL.enjoyment]),
        anniversary: redact(norm(row[COL.anniversary])),
        msgToZhang: redact(norm(row[COL.msgToZhang])),
        suggestion: redact(norm(row[COL.suggestion])),
        prize: prize(row),
        action: norm(row[COL.action]),
        exchangeNote: redact(norm(row[COL.exchangeNote])),
      }))
    if (!records.length) throw new Error('CSV 中没有有效记录')
    allRecords.value = records
    currentIndex.value = 0
    importState.value = 'ready'
    importMessage.value = `已载入 ${records.length} 条，${records.filter(isExchange).length} 条置换`
    reviewNote.value = notes.value[records[0]?.id] || ''
  } catch (e) {
    importState.value = 'error'
    importMessage.value = e?.message || '导入失败'
  }
}

function handleFile(e) { csvFile.value = e.target.files?.[0] || null; if (csvFile.value) importCsv() }

function loadDecisions() {
  try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); decisions.value = s.decisions || {}; notes.value = s.notes || {} } catch {}
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify({ decisions: decisions.value, notes: notes.value })) }

function goNext() { if (currentIndex.value < allRecords.value.length - 1) show(currentIndex.value + 1) }
function goPrev() { if (currentIndex.value > 0) show(currentIndex.value - 1) }
function show(i) {
  currentIndex.value = i
  revealResult.value = null
  reviewNote.value = notes.value[allRecords.value[i]?.id] || ''
  nextTick(() => { document.documentElement.scrollTop = 0; window.scrollTo(0, 0) })
}

function decide(decision) {
  if (!current.value || !isExchange(current.value)) return
  const rec = current.value
  const note = reviewNote.value.trim().slice(0, 500)
  decisions.value = { ...decisions.value, [rec.id]: decision }
  notes.value = { ...notes.value, [rec.id]: note }
  persist()
  revealResult.value = decision
  clearTimeout(decisionTimer)
  decisionTimer = setTimeout(() => {
    if (currentIndex.value < allRecords.value.length - 1) show(currentIndex.value + 1)
    else revealResult.value = null
  }, 900)
}

function getLabel(id) {
  const d = decisions.value[id]
  return d === 'approve' ? '同意' : d === 'reject' ? '不同意' : ''
}

function csvEscape(v) { const t = String(v ?? ''); return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t }
function ts() { const d = new Date(); const p = v => String(v).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}` }

function exportCsv() {
  const rows = allRecords.value.filter(r => isExchange(r) && decisions.value[r.id])
    .map(r => [r.id, r.name, r.boxNumber, r.prize, r.exchangeNote, getLabel(r.id), notes.value[r.id] || ''])
  if (!rows.length) return
  const csv = [['编号','昵称','盲盒号码','中奖产品','置换需求','审核结果','备注'], ...rows]
    .map(r => r.map(csvEscape).join(',')).join('\r\n')
  const b = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
  const u = URL.createObjectURL(b); const a = document.createElement('a')
  a.href = u; a.download = `置换审核_${rows.length}条_${ts()}.csv`
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(u)
}

function resetAll() {
  if (confirm('清除全部审核结果？')) { decisions.value = {}; notes.value = {}; persist(); reviewNote.value = '' }
}

function onKey(e) {
  if (importState.value !== 'ready') return
  if (e.key === 'ArrowLeft') goPrev()
  if (e.key === 'ArrowRight') goNext()
}

onMounted(() => { loadDecisions(); window.addEventListener('keydown', onKey) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); clearTimeout(decisionTimer) })
</script>

<template>
  <main class="ex-page">
    <div class="ex-grain"></div>

    <header class="ex-top">
      <a class="ex-logo" href="/"><span>✦</span><span>十周年纪念</span></a>
      <span class="ex-top-note">BLIND BOX · FULFILLMENT</span>
    </header>

    <!-- Import -->
    <section v-if="importState !== 'ready'" class="ex-hero">
      <p class="ex-eyebrow">FULFILLMENT REVIEW · 盲盒兑现审核</p>
      <h1>盲盒中奖<span>兑现一览</span></h1>
      <p class="ex-desc">导入「鲲鹏盲盒兑现表」CSV，逐条查看问卷回答。<br/>选择「置换」的记录需要审核确认。</p>

      <label class="ex-drop" :class="{ has: csvFile }">
        <input type="file" accept=".csv,text/csv" @change="handleFile">
        <span class="ex-drop-icon">📄</span>
        <strong>{{ csvFile ? csvFile.name : '点击选择 CSV 文件' }}</strong>
        <small>{{ csvFile ? '解析中…' : '鲲鹏盲盒兑现表_问卷_可对外.csv' }}</small>
      </label>
      <p v-if="importMessage" class="ex-msg" :class="importState">{{ importMessage }}</p>
    </section>

    <!-- Review (after import) -->
    <template v-if="importState === 'ready' && current">
      <!-- Stats bar -->
      <div class="ex-bar">
        <div class="ex-bar-stats">
          <div><strong>{{ totalCount }}</strong><span>全部</span></div>
          <i></i>
          <div><strong>{{ exchangeCount }}</strong><span>置换</span></div>
          <i></i>
          <div><strong style="color:#7db87b">{{ approveCount }}</strong><span>同意</span></div>
          <i></i>
          <div><strong style="color:#cc7b77">{{ rejectCount }}</strong><span>不同意</span></div>
          <i></i>
          <div><strong>{{ decidedCount }}/{{ exchangeCount }}</strong><span>已审</span></div>
        </div>
        <div class="ex-bar-btns">
          <button @click="exportCsv" :disabled="!decidedCount">导出</button>
          <button @click="resetAll" :disabled="!decidedCount">清除</button>
          <label class="ex-bar-btn-reimport">更换CSV<input type="file" accept=".csv,text/csv" @change="handleFile" hidden></label>
        </div>
      </div>

      <!-- Record -->
      <div class="ex-record" :class="{ 'dec-approve': currentDecision === 'approve', 'dec-reject': currentDecision === 'reject' }">
        <!-- Nav -->
        <div class="ex-nav">
          <button @click="goPrev" :disabled="currentIndex === 0">← 上一位</button>
          <strong>{{ currentIndex + 1 }} / {{ totalCount }}</strong>
          <button @click="goNext" :disabled="currentIndex === totalCount - 1">下一位 →</button>
        </div>

        <!-- Header -->
        <div class="ex-head">
          <div class="ex-avatar">{{ Array.from(current.name)[0] || '?' }}</div>
          <div class="ex-head-main">
            <h1>{{ current.name }}</h1>
            <p>编号 {{ current.id }} · 盲盒 {{ current.boxNumber }}
              <span v-if="currentDecision" class="ex-tag" :class="currentDecision === 'approve' ? 'tg' : 'tr'">{{ getLabel(current.id) }}</span>
            </p>
          </div>
          <div class="ex-head-side">
            <div class="ex-kv"><small>稀有度</small><strong>{{ current.rarity || '?' }}</strong></div>
            <div class="ex-kv"><small>中奖产品</small><strong>{{ current.prize }}</strong></div>
            <div class="ex-kv"><small>选择</small><strong :class="{ gold: isExchange(current) }">{{ current.action || '?' }}</strong></div>
          </div>
        </div>

        <!-- Scores -->
        <div class="ex-scores">
          <div class="ex-score"><small>满意度</small><strong>{{ current.satisfaction || '?' }}<em>/10</em></strong></div>
          <div class="ex-score"><small>好玩度</small><strong>{{ current.enjoyment || '?' }}<em>/10</em></strong></div>
          <div class="ex-score"><small>开盒人</small><strong>{{ current.opener || '?' }}</strong></div>
        </div>

        <!-- Text answers -->
        <div class="ex-answers">
          <div class="ex-answer" v-if="current.msgToOpener">
            <small>对开盒同学说的话</small>
            <p>{{ current.msgToOpener }}</p>
          </div>
          <div class="ex-answer" v-if="current.anniversary">
            <small>鲲鹏十周年祝福</small>
            <p>{{ current.anniversary }}</p>
          </div>
          <div class="ex-answer" v-if="current.msgToZhang">
            <small>想对张导说的话</small>
            <p>{{ current.msgToZhang }}</p>
          </div>
          <div class="ex-answer" v-if="current.suggestion">
            <small>建议</small>
            <p>{{ current.suggestion }}</p>
          </div>

          <!-- Exchange section -->
          <div v-if="isExchange(current)" class="ex-answer ex-exchange">
            <small>置换需求</small>
            <p>{{ current.exchangeNote || '（未填写）' }}</p>
          </div>

          <div v-if="isExchange(current)" class="ex-note">
            <label><span>审核备注</span><em>{{ reviewNote.length }}/500</em></label>
            <textarea v-model="reviewNote" maxlength="500" placeholder="审核备注（可选）…"></textarea>
          </div>
        </div>
      </div>

      <!-- Decision buttons (only exchange) -->
      <div v-if="isExchange(current)" class="ex-decisions">
        <button class="ex-dbtn reject" :class="{ sel: currentDecision === 'reject' }" @click="decide('reject')">
          <span>×</span><strong>不同意</strong>
        </button>
        <button class="ex-dbtn approve" :class="{ sel: currentDecision === 'approve' }" @click="decide('approve')">
          <span>✓</span><strong>同意</strong>
        </button>
      </div>

      <p class="ex-hint">← → 键切换 · 审核后自动跳下一位</p>
    </template>

    <!-- Decision overlay -->
    <Transition name="rev">
      <div v-if="revealResult" class="ex-reveal" :class="revealResult">
        <div class="ex-reveal-icon">{{ revealResult === 'approve' ? '✓' : '×' }}</div>
        <strong>{{ revealResult === 'approve' ? '同意' : '不同意' }}</strong>
        <small>{{ currentIndex < totalCount - 1 ? '跳转下一位…' : '已到最后' }}</small>
      </div>
    </Transition>

    <footer class="ex-footer">
      <p>盲盒中奖兑现一览 · 鲲鹏十周年</p>
      <a href="/">返回首页</a>
    </footer>
  </main>
</template>
