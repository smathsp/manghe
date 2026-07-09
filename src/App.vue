<script setup>
import { ref, computed } from 'vue'
import NavBar from './components/NavBar.vue'
import TierRow from './components/TierRow.vue'
import PoolSection from './components/PoolSection.vue'
import { ITEMS } from './data/items'

// Pools (items waiting to be assigned)
const legendaryPool = ref(ITEMS.filter(i => i.rarity === 'legendary'))
const rarePool = ref(ITEMS.filter(i => i.rarity === 'rare'))
const commonPool = ref(ITEMS.filter(i => i.rarity === 'common'))

// Tier list (assigned items)
const legendaryItems = ref([])
const rareItems = ref([])
const commonItems = ref([])

const forceUpdate = ref(0)
const triggerUpdate = () => { forceUpdate.value++ }

const resetAll = () => {
  legendaryPool.value = ITEMS.filter(i => i.rarity === 'legendary')
  rarePool.value = ITEMS.filter(i => i.rarity === 'rare')
  commonPool.value = ITEMS.filter(i => i.rarity === 'common')
  legendaryItems.value = []
  rareItems.value = []
  commonItems.value = []
  forceUpdate.value++
}

const totalAssigned = computed(() =>
  legendaryItems.value.length + rareItems.value.length + commonItems.value.length
)

const selectedPrice = ref(299)
const prices = [199, 299, 399, 499, 599]
const nickname = ref('')
const message = ref('')
const submitTip = ref('')

const submitData = () => {
  const data = {
    ranking: {
      legendary: legendaryItems.value.map(i => i.name),
      rare: rareItems.value.map(i => i.name),
      common: commonItems.value.map(i => i.name),
    },
    price: selectedPrice.value,
    nickname: nickname.value,
    message: message.value,
    timestamp: new Date().toISOString(),
  }
  const json = JSON.stringify(data, null, 2)
  navigator.clipboard.writeText(json).then(() => {
    submitTip.value = '已复制到剪切板，正在打开表单...'
    setTimeout(() => {
      window.open('https://my.feishu.cn/share/base/form/shrcnpkbkXiuyYdTk5oueTmWzkh', '_blank')
    }, 500)
  }).catch(() => {
    submitTip.value = '复制失败，请手动复制'
  })
}
</script>

<template>
  <div class="min-h-screen" style="background: var(--bg-dark);">
    <NavBar @reset="resetAll" />

    <!-- Hero -->
    <section class="hero" ref="heroRef">
      <div class="container relative z-10">
        <p class="hero-sub anim-fade-in">鲲鹏十周年</p>
        <h1 class="anim-fade-in">十周年盲盒你来选</h1>
        <p class="hero-desc anim-fade-in">将设备拖拽到对应稀有度等级</p>
        <div class="flex justify-center anim-fade-in">
          <span style="font-size: 13px; color: var(--text-secondary);">
            已分配 <span style="color: var(--gold); font-family: monospace;">{{ totalAssigned }}</span> / 24
          </span>
        </div>
      </div>
    </section>

    <!-- 传说 -->
    <section class="section-block">
      <div class="container">
        <div class="tier-list">
          <TierRow
            label="传说" color="gold" rarity="legendary"
            :max="6" :items="legendaryItems" :pool-items="legendaryPool" @update="triggerUpdate"
          />
        </div>
        <PoolSection
          title="传说设备" dot-color="var(--gold)" title-color="var(--gold)"
          :items="legendaryPool" item-class="pool-item-gold" rarity-color="gold" @update="triggerUpdate"
        />
      </div>
    </section>

    <!-- 稀有 -->
    <section class="section-block">
      <div class="container">
        <div class="tier-list">
          <TierRow
            label="稀有" color="red" rarity="rare"
            :max="6" :items="rareItems" :pool-items="rarePool" @update="triggerUpdate"
          />
        </div>
        <PoolSection
          title="稀有设备" dot-color="var(--red)" title-color="var(--red)"
          :items="rarePool" item-class="pool-item-red" rarity-color="red" @update="triggerUpdate"
        />
      </div>
    </section>

    <!-- 普通 -->
    <section class="section-block">
      <div class="container">
        <div class="tier-list">
          <TierRow
            label="普通" color="purple" rarity="common"
            :max="12" :items="commonItems" :pool-items="commonPool" @update="triggerUpdate"
          />
        </div>
        <PoolSection
          title="普通设备" dot-color="var(--purple)" title-color="var(--purple)"
          :items="commonPool" item-class="pool-item-purple" rarity-color="purple" :text-only="true" @update="triggerUpdate"
        />
      </div>
    </section>

    <!-- Price Selector -->
    <section class="section-block">
      <div class="container">
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px;">
          <svg class="w-5 h-5" style="color: var(--gold);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
          <h2 style="font-size: 20px; font-weight: 700;">你觉得盲盒价值</h2>
        </div>
        <div class="price-options" style="justify-content: center;">
          <label
            v-for="price in prices"
            :key="price"
            class="price-option"
            :class="{ active: selectedPrice === price }"
          >
            <input type="radio" :value="price" v-model="selectedPrice" class="price-radio" />
            <span class="price-value">¥{{ price }}</span>
          </label>
        </div>
      </div>
    </section>

    <!-- User Message -->
    <section class="section-block">
      <div class="container">
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 16px;">
          <svg class="w-5 h-5" style="color: var(--gold);" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"></path>
          </svg>
          <h2 style="font-size: 20px; font-weight: 700;">留言给鲲鹏</h2>
        </div>
        <div class="message-row">
          <div class="message-field">
            <label class="field-label">你的昵称</label>
            <input
              v-model="nickname"
              type="text"
              placeholder="请输入昵称"
              class="field-input"
            />
          </div>
          <div class="message-field" style="flex: 2;">
            <label class="field-label">你想对鲲鹏说的话</label>
            <input
              v-model="message"
              type="text"
              placeholder="说点什么吧..."
              class="field-input"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Submit Button -->
    <section class="section-block">
      <div class="container" style="text-align: center;">
        <button class="btn-submit" @click="submitData">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
          提交排行数据
        </button>
        <p v-if="submitTip" class="submit-tip">{{ submitTip }}</p>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <p>鲲鹏十周年 · 十周年盲盒你来选 · Hangtola</p>
      </div>
    </footer>
  </div>
</template>
