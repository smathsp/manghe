<template>
  <section class="hero" ref="heroRef">
    <div class="container relative z-10">
      <p class="hero-sub anim-fade-in">鲲鹏十周年</p>
      <h1 class="anim-fade-in">十周年盲盒你来选</h1>
      <p class="hero-desc anim-fade-in">鲲鹏十周年 · 将设备拖拽到对应稀有度等级</p>

      <!-- Tier List Preview -->
      <div class="hero-preview anim-fade-in">
        <div class="tier-list">
          <div class="tier-row gold-row">
            <div class="tier-label gold">
              传说
              <span class="tier-count">8</span>
            </div>
            <div class="tier-content">
              <div class="tier-item gold-item anim-shimmer" style="animation-delay: 0s">⚡</div>
              <div class="tier-item gold-item anim-shimmer" style="animation-delay: 0.3s">🔥</div>
              <div class="tier-item gold-item anim-shimmer" style="animation-delay: 0.6s">💎</div>
              <span style="color: var(--text-tertiary); font-size: 12px; margin-left: 4px">...</span>
            </div>
          </div>
          <div class="tier-row red-row">
            <div class="tier-label red">
              稀有
              <span class="tier-count">7</span>
            </div>
            <div class="tier-content">
              <div class="tier-item red-item anim-shimmer" style="animation-delay: 0.1s">🎯</div>
              <div class="tier-item red-item anim-shimmer" style="animation-delay: 0.4s">🏆</div>
              <div class="tier-item red-item anim-shimmer" style="animation-delay: 0.7s">🔮</div>
              <span style="color: var(--text-tertiary); font-size: 12px; margin-left: 4px">...</span>
            </div>
          </div>
          <div class="tier-row purple-row">
            <div class="tier-label purple">
              普通
              <span class="tier-count">21</span>
            </div>
            <div class="tier-content">
              <div class="tier-item purple-item anim-shimmer" style="animation-delay: 0.2s">📦</div>
              <div class="tier-item purple-item anim-shimmer" style="animation-delay: 0.5s">🔧</div>
              <div class="tier-item purple-item anim-shimmer" style="animation-delay: 0.8s">⚙️</div>
              <span style="color: var(--text-tertiary); font-size: 12px; margin-left: 4px">...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="flex flex-col sm:flex-row gap-3 justify-center anim-fade-in">
        <a class="btn btn-primary" style="padding: 10px 28px; font-size: 15px;" href="#tier-list" @click.prevent="scrollTo('#tier-list')">
          开始分配
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"></path>
          </svg>
        </a>
        <a class="btn btn-ghost" style="padding: 10px 28px; font-size: 15px;" href="#item-pool" @click.prevent="scrollTo('#item-pool')">
          浏览设备
        </a>
      </div>
    </div>

    <!-- Background particles -->
    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        v-for="p in particles"
        :key="p.id"
        class="absolute rounded-full"
        :style="{
          left: p.x + '%',
          top: p.y + '%',
          width: p.size + 'px',
          height: p.size + 'px',
          background: p.color,
          opacity: p.opacity,
          animation: `float ${p.dur}s ease-in-out infinite`,
          animationDelay: p.delay + 's',
        }"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import gsap from 'gsap'

const heroRef = ref(null)
const particles = ref([])

const scrollTo = (sel) => {
  document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  // GSAP stagger animation
  if (heroRef.value) {
    gsap.from(heroRef.value.querySelectorAll('.anim-fade-in'), {
      y: 30,
      opacity: 0,
      duration: 0.8,
      stagger: 0.15,
      ease: 'power3.out',
    })
  }

  // Generate particles
  const colors = [
    'rgba(212, 168, 67, 0.4)',
    'rgba(231, 76, 60, 0.25)',
    'rgba(155, 89, 182, 0.25)',
    'rgba(255, 255, 255, 0.1)',
  ]
  particles.value = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    color: colors[i % colors.length],
    dur: Math.random() * 6 + 4,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.5 + 0.15,
  }))
})
</script>
