<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { VOID_BOX_ORDERS } from './data/voidBoxOrders'
import './void-box.css'

const isExportMode = new URLSearchParams(window.location.search).has('export')
const visible = ref(false)
const leftOrders = computed(() => VOID_BOX_ORDERS.slice(0, 32))
const rightOrders = computed(() => VOID_BOX_ORDERS.slice(32))

onMounted(() => {
  document.documentElement.classList.add('void-box-document')
  requestAnimationFrame(() => {
    visible.value = true
  })
})

onUnmounted(() => {
  document.documentElement.classList.remove('void-box-document')
})
</script>

<template>
  <main class="void-page" :class="{ 'is-visible': visible, 'is-export': isExportMode }">
    <div class="void-stars" aria-hidden="true"></div>

    <header class="void-nav">
      <div class="void-shell void-nav-inner">
        <a class="void-brand" href="/" aria-label="返回首页">
          <span class="void-brand-mark" aria-hidden="true">虚</span>
          <span>虚空大帝</span>
        </a>
        <span class="void-nav-note">VOID EMPEROR · BLIND BOX</span>
      </div>
    </header>

    <section class="void-hero" aria-labelledby="void-title">
      <div class="void-halo void-halo-one" aria-hidden="true"></div>
      <div class="void-halo void-halo-two" aria-hidden="true"></div>
      <div class="void-shell void-hero-inner">
        <p class="void-eyebrow">
          <span></span>
          THE VOID HAS CHOSEN
          <span></span>
        </p>
        <div class="void-seal" aria-hidden="true">
          <i></i>
          <strong>帝</strong>
          <i></i>
        </div>
        <p class="void-overline">2026 · LIMITED BLIND BOX ROSTER</p>
        <h1 id="void-title">
          虚空大帝
          <em>盲盒名单</em>
        </h1>
        <p class="void-lead">
          星轨已经落定，来自虚空的回响已抵达。<br />
          感谢每一次选择，愿这一份期待在开启时闪耀。
        </p>
        <div class="void-stats" aria-label="名单统计">
          <div>
            <strong>{{ VOID_BOX_ORDERS.length }}</strong>
            <span>份订单</span>
          </div>
          <i></i>
          <div>
            <strong>2026.07.25</strong>
            <span>名单日期</span>
          </div>
          <i></i>
          <div>
            <strong>NO. 01—64</strong>
            <span>登记序列</span>
          </div>
        </div>
      </div>
    </section>

    <div class="void-ribbon" aria-hidden="true">
      <span>✦</span>
      <p>THE STAR PATH IS SET</p>
      <span>✦</span>
      <p>虚空回响 · 荣耀同行</p>
      <span>✦</span>
      <p>64 ORDERS · ONE DESTINY</p>
      <span>✦</span>
    </div>

    <section class="void-roster" aria-labelledby="roster-title">
      <div class="void-shell">
        <header class="void-roster-heading">
          <div>
            <span class="void-heading-glyph" aria-hidden="true">✦</span>
            <div>
              <p>THE CHOSEN ROSTER</p>
              <h2 id="roster-title">虚空大帝盲盒登记名录</h2>
            </div>
          </div>
          <p>以下名单按订单时间排序 · 不分名次</p>
        </header>

        <div class="void-columns">
          <ol class="void-list" aria-label="虚空大帝盲盒名单第 1 至 32 位">
            <li
              v-for="(order, index) in leftOrders"
              :key="order.orderNumber"
              class="void-card"
              :style="{ '--enter-delay': `${Math.min(index, 10) * 32}ms` }"
            >
              <span class="void-number">{{ String(order.number).padStart(2, '0') }}</span>
              <div class="void-identity">
                <strong>{{ order.name }}</strong>
                <span>{{ order.maskedPhone }}</span>
              </div>
              <div class="void-order">
                <small>ORDER NO.</small>
                <code>{{ order.orderNumber }}</code>
              </div>
            </li>
          </ol>

          <ol class="void-list" start="33" aria-label="虚空大帝盲盒名单第 33 至 64 位">
            <li
              v-for="(order, index) in rightOrders"
              :key="order.orderNumber"
              class="void-card"
              :style="{ '--enter-delay': `${Math.min(index, 10) * 32 + 80}ms` }"
            >
              <span class="void-number">{{ String(order.number).padStart(2, '0') }}</span>
              <div class="void-identity">
                <strong>{{ order.name }}</strong>
                <span>{{ order.maskedPhone }}</span>
              </div>
              <div class="void-order">
                <small>ORDER NO.</small>
                <code>{{ order.orderNumber }}</code>
              </div>
            </li>
          </ol>
        </div>

        <div class="void-closing">
          <span>THE VOID REMEMBERS EVERY NAME</span>
          <h2>名单已落定，静候惊喜开启</h2>
          <p>感谢每一位参与虚空大帝盲盒的朋友。请妥善保存订单信息，最终名单以订单系统记录为准。</p>
          <div class="void-signature">
            <i></i>
            虚空大帝盲盒 · 2026
            <i></i>
          </div>
        </div>
      </div>
    </section>

    <footer class="void-footer">
      <div class="void-shell">
        <p>以星辰为证 · 共赴虚空之约</p>
        <a href="/">返回首页</a>
      </div>
    </footer>
  </main>
</template>
