<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { MAILBOXES } from './data/mailboxes'
import './mailbox.css'

const activeMailbox = ref(null)
const activeLetterIndex = ref(0)
const openedMailboxes = ref(new Set())
const direction = ref('next')
const touchStartX = ref(0)

const activeLetter = computed(
  () => activeMailbox.value?.letters[activeLetterIndex.value] ?? null,
)
const totalLetters = computed(
  () => MAILBOXES.reduce((total, mailbox) => total + mailbox.letters.length, 0),
)

const openMailbox = (mailbox) => {
  activeMailbox.value = mailbox
  activeLetterIndex.value = 0
  direction.value = 'next'
  openedMailboxes.value = new Set([...openedMailboxes.value, mailbox.id])
}

const closeReader = () => {
  activeMailbox.value = null
}

const nextLetter = () => {
  if (!activeMailbox.value) return
  direction.value = 'next'
  activeLetterIndex.value = Math.min(
    activeLetterIndex.value + 1,
    activeMailbox.value.letters.length - 1,
  )
}

const previousLetter = () => {
  if (!activeMailbox.value) return
  direction.value = 'previous'
  activeLetterIndex.value = Math.max(activeLetterIndex.value - 1, 0)
}

const jumpToLetter = (index) => {
  direction.value = index >= activeLetterIndex.value ? 'next' : 'previous'
  activeLetterIndex.value = index
}

const onKeydown = (event) => {
  if (!activeMailbox.value) return
  if (event.key === 'Escape') closeReader()
  if (event.key === 'ArrowRight') nextLetter()
  if (event.key === 'ArrowLeft') previousLetter()
}

const onTouchStart = (event) => {
  touchStartX.value = event.changedTouches[0]?.clientX ?? 0
}

const onTouchEnd = (event) => {
  const endX = event.changedTouches[0]?.clientX ?? touchStartX.value
  const distance = endX - touchStartX.value
  if (Math.abs(distance) < 50) return
  if (distance < 0) nextLetter()
  else previousLetter()
}

watch(activeMailbox, (mailbox) => {
  document.body.classList.toggle('mail-reader-open', Boolean(mailbox))
})

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.classList.remove('mail-reader-open')
})
</script>

<template>
  <main class="mailbox-page">
    <div class="mailbox-grain" aria-hidden="true"></div>

    <header class="mailbox-header">
      <a class="mailbox-brand" href="/" aria-label="返回首页">
        <span class="mailbox-brand-mark" aria-hidden="true">✦</span>
        <span>十周年纪念</span>
      </a>
      <span class="mailbox-header-note">共 {{ totalLetters }} 封精选来信</span>
    </header>

    <section class="mailbox-hero" aria-labelledby="mailbox-title">
      <p class="mailbox-eyebrow">LETTERS THROUGH TIME · 时光来信</p>
      <h1 id="mailbox-title">
        把想说的话，
        <span>一封封打开</span>
      </h1>
      <p class="mailbox-intro">
        从真实投稿中整理出 {{ MAILBOXES.length }} 组来信，收藏进不同的信箱。<br />
        选一格打开，让故事与心愿慢慢来到你面前。
      </p>
      <a class="mailbox-scroll-cue" href="#mailbox-wall">
        <span>选择一个信箱</span>
        <span aria-hidden="true">↓</span>
      </a>
    </section>

    <section id="mailbox-wall" class="mailbox-section" aria-labelledby="wall-title">
      <div class="mailbox-section-heading">
        <div>
          <p>THE MAIL ROOM</p>
          <h2 id="wall-title">时光邮局</h2>
        </div>
        <p class="mailbox-section-caption">
          已整理 {{ totalLetters }} 封来信，点击任意信箱开始阅读
        </p>
      </div>

      <div class="mailbox-grid">
        <button
          v-for="mailbox in MAILBOXES"
          :key="mailbox.id"
          class="mailbox-door"
          :class="[`mailbox-door--${mailbox.tone}`, { 'is-opened': openedMailboxes.has(mailbox.id) }]"
          type="button"
          :aria-label="`打开${mailbox.name}，共 ${mailbox.letters.length} 封信`"
          @click="openMailbox(mailbox)"
        >
          <span class="mailbox-door-inner">
            <span class="mailbox-number">{{ mailbox.number }}</span>
            <span class="mailbox-slot" aria-hidden="true">
              <span></span>
            </span>
            <span class="mailbox-door-copy">
              <strong>{{ mailbox.name }}</strong>
              <small>{{ mailbox.subtitle }}</small>
            </span>
            <span class="mailbox-door-footer">
              <span>{{ mailbox.letters.length }} LETTERS</span>
              <span>{{ openedMailboxes.has(mailbox.id) ? '再次打开' : '开启信箱' }} →</span>
            </span>
          </span>
        </button>
      </div>
    </section>

    <footer class="mailbox-footer">
      <span>来信在不改变原意的基础上做了标点与文字整理。</span>
      <a href="#mailbox-title">回到顶部 ↑</a>
    </footer>

    <Transition name="reader-fade">
      <div
        v-if="activeMailbox && activeLetter"
        class="mail-reader"
        role="dialog"
        aria-modal="true"
        :aria-label="`${activeMailbox.name}，第 ${activeLetterIndex + 1} 封信`"
        @click.self="closeReader"
      >
        <div class="mail-reader-shell">
          <div class="mail-reader-topbar">
            <div>
              <span class="mail-reader-kicker">{{ activeMailbox.number }} · {{ activeMailbox.name }}</span>
              <span class="mail-reader-count">
                {{ String(activeLetterIndex + 1).padStart(2, '0') }}
                / {{ String(activeMailbox.letters.length).padStart(2, '0') }}
              </span>
            </div>
            <button type="button" class="mail-reader-close" aria-label="关闭信件" @click="closeReader">
              <span aria-hidden="true">×</span>
            </button>
          </div>

          <div
            class="mail-reader-stage"
            @touchstart.passive="onTouchStart"
            @touchend.passive="onTouchEnd"
          >
            <Transition :name="direction === 'next' ? 'letter-next' : 'letter-previous'" mode="out-in">
              <article :key="activeLetter.id" class="letter-paper">
                <div class="letter-paper-index">
                  {{ activeMailbox.number }}—{{ String(activeLetterIndex + 1).padStart(2, '0') }}
                </div>
                <p class="letter-salutation">{{ activeLetter.salutation }}</p>
                <h3>{{ activeLetter.title }}</h3>
                <div class="letter-body">
                  <p v-for="paragraph in activeLetter.body" :key="paragraph">
                    {{ paragraph }}
                  </p>
                </div>
                <div class="letter-signature">
                  <span>{{ activeLetter.signature }}</span>
                  <time>{{ activeLetter.date }}</time>
                </div>
              </article>
            </Transition>
          </div>

          <div class="mail-reader-controls">
            <button
              type="button"
              :disabled="activeLetterIndex === 0"
              @click="previousLetter"
            >
              <span aria-hidden="true">←</span>
              上一封
            </button>

            <div class="mail-reader-dots" aria-label="选择信件">
              <button
                v-for="(_, index) in activeMailbox.letters"
                :key="index"
                type="button"
                :class="{ active: index === activeLetterIndex }"
                :aria-label="`查看第 ${index + 1} 封信`"
                :aria-current="index === activeLetterIndex ? 'page' : undefined"
                @click="jumpToLetter(index)"
              ></button>
            </div>

            <button
              type="button"
              :disabled="activeLetterIndex === activeMailbox.letters.length - 1"
              @click="nextLetter"
            >
              下一封
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <p class="mail-reader-hint">使用 ← → 翻阅 · 按 ESC 关闭</p>
        </div>
      </div>
    </Transition>
  </main>
</template>
