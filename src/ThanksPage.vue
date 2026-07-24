<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { KUNPENG_SUPPORTERS, SELECTED_SUPPORTERS } from './data/gratitude'
import './thanks.css'

const visible = ref(false)

const gratitudeEchoes = [
  '谢谢你的相信',
  '因你而更有力量',
  '这份心意已被珍藏',
  '感谢一路同行',
  '你的支持自带光芒',
]

onMounted(() => {
  requestAnimationFrame(() => {
    visible.value = true
  })
  document.documentElement.classList.add('gratitude-document')
})

onUnmounted(() => {
  document.documentElement.classList.remove('gratitude-document')
})
</script>

<template>
  <main class="gratitude-page" :class="{ 'is-visible': visible }">
    <header class="gratitude-nav">
      <div class="gratitude-shell gratitude-nav-inner">
        <a class="gratitude-brand" href="/" aria-label="返回首页">
          <span class="gratitude-brand-mark" aria-hidden="true">鲲</span>
          <span>鲲鹏张导</span>
        </a>
        <span class="gratitude-nav-note">同心 · 同行 · 同频</span>
      </div>
    </header>

    <section class="gratitude-hero" aria-labelledby="gratitude-title">
      <div class="gratitude-orbit gratitude-orbit-one" aria-hidden="true"></div>
      <div class="gratitude-orbit gratitude-orbit-two" aria-hidden="true"></div>
      <div class="gratitude-shell gratitude-hero-inner">
        <div class="gratitude-kicker">
          <i aria-hidden="true"></i>
          <span>THANKS FOR BEING HERE</span>
          <i aria-hidden="true"></i>
        </div>
        <div class="gratitude-honor-badge">
          <span aria-hidden="true">✦</span>
          致每一位真诚相伴的朋友
          <span aria-hidden="true">✦</span>
        </div>
        <p class="gratitude-overline">KUNPENG ZHANGDAO · HONOR WALL</p>
        <h1 id="gratitude-title">
          每一次支持
          <em>都值得被写进星河</em>
        </h1>
        <p class="gratitude-lead">
          你不是名单里的一个名字，而是我们一路向前的底气。<br />
          谢谢你的相信、陪伴与真心——这份温暖，我们郑重珍藏。
        </p>
        <div class="gratitude-promise">
          <span aria-hidden="true">✦</span>
          不论先后 · 每一份真心都拥有同等分量
          <span aria-hidden="true">✦</span>
        </div>
      </div>
      <div class="gratitude-scroll-hint" aria-hidden="true">
        <span></span>
        感恩相逢
      </div>
    </section>

    <div class="gratitude-marquee" aria-hidden="true">
      <div class="gratitude-marquee-track">
        <div class="gratitude-marquee-group">
          <span>THANK YOU FOR EVERY MOMENT OF TRUST</span>
          <i>✦</i>
          <span>感恩每一次坚定的选择</span>
          <i>✦</i>
          <span>YOUR SUPPORT LIGHTS THE WAY</span>
          <i>✦</i>
          <span>感谢相遇 · 更感谢一直都在</span>
          <i>✦</i>
        </div>
        <div class="gratitude-marquee-group">
          <span>THANK YOU FOR EVERY MOMENT OF TRUST</span>
          <i>✦</i>
          <span>感恩每一次坚定的选择</span>
          <i>✦</i>
          <span>YOUR SUPPORT LIGHTS THE WAY</span>
          <i>✦</i>
          <span>感谢相遇 · 更感谢一直都在</span>
          <i>✦</i>
        </div>
      </div>
    </div>

    <section class="gratitude-list-section" aria-labelledby="supporters-title">
      <div class="gratitude-shell gratitude-list-shell">
        <div class="gratitude-list-heading">
          <div>
            <span class="gratitude-heading-glyph" aria-hidden="true">✦</span>
            <div>
              <p>TWO STARS · ONE HEART</p>
              <h2 id="supporters-title">双星感恩荣光墙</h2>
            </div>
          </div>
          <p>所有真心，都在这里熠熠生辉</p>
        </div>

        <div class="gratitude-columns">
          <section class="gratitude-column" aria-labelledby="kunpeng-list-title">
            <header class="gratitude-column-header">
              <span class="gratitude-column-seal" aria-hidden="true">鲲</span>
              <div>
                <p>KUNPENG · WITH GRATITUDE</p>
                <h3 id="kunpeng-list-title">鲲鹏张导</h3>
                <small>感恩名单</small>
                <em>因为有你，每一步都走得更坚定</em>
              </div>
            </header>
            <ul class="gratitude-list" aria-label="鲲鹏张导账号感恩名单">
              <li
                v-for="(supporter, index) in KUNPENG_SUPPORTERS"
                :key="supporter.douyinId"
                class="gratitude-card"
                :style="{ '--enter-delay': `${Math.min(index, 12) * 32}ms` }"
              >
                <span class="gratitude-card-spark" aria-hidden="true">✦</span>
                <div class="gratitude-identity">
                  <strong>{{ supporter.nickname }}</strong>
                  <span>抖音号 · {{ supporter.douyinId }}</span>
                </div>
                <div class="gratitude-card-echo">
                  <span>{{ gratitudeEchoes[index % gratitudeEchoes.length] }}</span>
                  <i aria-hidden="true">♥</i>
                </div>
              </li>
            </ul>
          </section>

          <section class="gratitude-column gratitude-column-selected" aria-labelledby="selected-list-title">
            <header class="gratitude-column-header">
              <span class="gratitude-column-seal" aria-hidden="true">选</span>
              <div>
                <p>ZHANGDAO SELECT · THANK YOU</p>
                <h3 id="selected-list-title">张导严选</h3>
                <small>感恩名单</small>
                <em>你的认可，是一份闪耀的勋章</em>
              </div>
            </header>
            <ul class="gratitude-list" aria-label="张导严选感恩名单">
              <li
                v-for="(supporter, index) in SELECTED_SUPPORTERS"
                :key="supporter.douyinId"
                class="gratitude-card"
                :style="{ '--enter-delay': `${Math.min(index, 12) * 32 + 80}ms` }"
              >
                <span class="gratitude-card-spark" aria-hidden="true">✦</span>
                <div class="gratitude-identity">
                  <strong>{{ supporter.nickname }}</strong>
                  <span>抖音号 · {{ supporter.douyinId }}</span>
                </div>
                <div class="gratitude-card-echo">
                  <span>{{ gratitudeEchoes[(index + 2) % gratitudeEchoes.length] }}</span>
                  <i aria-hidden="true">♥</i>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <div class="gratitude-closing">
          <span>THE BEST IS YET TO COME</span>
          <h2>你的名字在这里，你的情谊在心里</h2>
          <p>感谢你把信任交给我们。未来的每一程，愿我们继续彼此照亮，并肩奔赴更辽阔的星河。</p>
          <div class="gratitude-signature">
            <i></i>
            鲲鹏张导 & 张导严选 · 敬谢
            <i></i>
          </div>
        </div>
      </div>
    </section>

    <footer class="gratitude-footer">
      <div class="gratitude-shell">
        <p>山高水长，感恩相逢</p>
        <a href="/">返回首页</a>
      </div>
    </footer>
  </main>
</template>
