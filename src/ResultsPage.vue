<script setup>
import { nextTick, ref } from 'vue'
import { RESULT_GROUPS, TOTAL_BALLOTS } from './data/results'

const numberFormatter = new Intl.NumberFormat('zh-CN')
const resultsPageRef = ref(null)
const isExporting = ref(false)

const waitForImages = (container) => Promise.all(
  Array.from(container.querySelectorAll('img')).map(image => {
    if (image.complete) return Promise.resolve()

    return new Promise(resolve => {
      image.addEventListener('load', resolve, { once: true })
      image.addEventListener('error', resolve, { once: true })
    })
  }),
)

const preserveExportImageRatios = (container) => {
  container.querySelectorAll('.winner-visual img').forEach(image => {
    if (!image.naturalWidth || !image.naturalHeight) return

    const maxSize = 84
    const scale = Math.min(
      maxSize / image.naturalWidth,
      maxSize / image.naturalHeight,
    )

    image.style.width = `${Math.round(image.naturalWidth * scale)}px`
    image.style.height = `${Math.round(image.naturalHeight * scale)}px`
    image.style.objectFit = 'fill'
  })
}

const exportPng = async () => {
  if (isExporting.value || !resultsPageRef.value) return

  isExporting.value = true
  let exportNode

  try {
    await nextTick()
    await document.fonts?.ready

    const { default: html2canvas } = await import('html2canvas')
    exportNode = resultsPageRef.value.cloneNode(true)
    exportNode.classList.add('results-page-export')
    exportNode.setAttribute('aria-hidden', 'true')
    exportNode.querySelectorAll('[data-html2canvas-ignore]').forEach(element => element.remove())
    document.body.appendChild(exportNode)

    await waitForImages(exportNode)
    preserveExportImageRatios(exportNode)

    const width = exportNode.offsetWidth
    const height = exportNode.scrollHeight
    const canvas = await html2canvas(exportNode, {
      scale: 2,
      width,
      height,
      windowWidth: width,
      windowHeight: height,
      backgroundColor: '#07070b',
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
    })

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('PNG generation failed')

    const downloadUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = '十周年盲盒-用户票选结果-2x.png'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  } catch (error) {
    console.error('导出 PNG 失败：', error)
    window.alert('PNG 导出失败，请稍后重试。')
  } finally {
    exportNode?.remove()
    isExporting.value = false
  }
}
</script>

<template>
  <main ref="resultsPageRef" class="results-page">
    <header class="results-nav">
      <div class="results-shell results-nav-inner">
        <a class="results-brand" href="/" aria-label="返回盲盒筛选工具首页">
          <span class="brand-mark">10</span>
          <span>
            <strong>十周年盲盒</strong>
            <small>用户票选结果</small>
          </span>
        </a>
        <div class="results-nav-actions">
          <button
            class="export-png-button"
            type="button"
            :disabled="isExporting"
            data-html2canvas-ignore
            @click="exportPng"
          >
            <span aria-hidden="true">{{ isExporting ? '···' : '⇩' }}</span>
            {{ isExporting ? '正在生成' : '导出 PNG' }}
            <small>2×</small>
          </button>
          <a class="back-link" href="/">
            <span aria-hidden="true">←</span>
            <span class="back-link-label">返回筛选工具</span>
          </a>
        </div>
      </div>
    </header>

    <section class="results-hero">
      <div class="results-shell results-hero-inner">
        <div class="results-kicker"><span></span> COMMUNITY CHOICE 2026</div>
        <h1>大家选出的<br /><em>十周年盲盒</em></h1>
        <p>感谢每一次认真选择。依据用户票选结果，各等级得票最高的设备已经产生。</p>

        <div class="result-summary" aria-label="结果统计">
          <div>
            <strong>{{ RESULT_GROUPS.reduce((sum, group) => sum + group.limit, 0) }}</strong>
            <span>入选设备</span>
          </div>
          <i></i>
          <div>
            <strong>{{ numberFormatter.format(TOTAL_BALLOTS) }}</strong>
            <span>累计得票</span>
          </div>
          <i></i>
          <div>
            <strong>5 · 5 · 10</strong>
            <span>等级名额</span>
          </div>
        </div>
      </div>
    </section>

    <section class="ranking-section">
      <div class="results-shell">
        <article
          v-for="group in RESULT_GROUPS"
          :key="group.key"
          class="ranking-group"
          :class="`ranking-${group.color}`"
        >
          <header class="ranking-header">
            <div class="ranking-title-block">
              <span class="ranking-gem" aria-hidden="true"></span>
              <div>
                <span>{{ group.eyebrow }}</span>
                <h2>{{ group.label }}入选</h2>
              </div>
            </div>
            <div class="ranking-meta">
              <strong>TOP {{ group.limit }}</strong>
              <span>{{ numberFormatter.format(group.totalVotes) }} 票参与本等级评选</span>
            </div>
          </header>

          <ol class="winner-grid">
            <li
              v-for="(item, index) in group.winners"
              :key="item.id"
              class="winner-card"
              :class="{ 'winner-card-top': index < 3, 'winner-card-text': !item.image }"
            >
              <div class="winner-rank">
                <small>NO.</small>
                <strong>{{ String(index + 1).padStart(2, '0') }}</strong>
              </div>

              <div class="winner-visual">
                <img v-if="item.image" :src="item.image" :alt="item.name" />
                <span v-else>{{ item.name.slice(0, 2) }}</span>
              </div>

              <div class="winner-info">
                <h3>{{ item.name }}</h3>
                <div class="vote-row">
                  <strong>{{ item.votes }}</strong>
                  <span>票</span>
                  <div class="vote-line">
                    <i :style="{ width: `${(item.votes / group.winners[0].votes) * 100}%` }"></i>
                  </div>
                </div>
              </div>

              <span v-if="index === 0" class="winner-badge">本级人气王</span>
            </li>
          </ol>
        </article>

        <div class="results-note">
          <span aria-hidden="true">✦</span>
          <p><strong>计票说明</strong> 同一等级内按票数由高到低排序，分别取前 5、前 5、前 10 名。普通等级第 9、10 名均为 93 票。</p>
        </div>
      </div>
    </section>

    <footer class="results-footer">
      <div class="results-shell">
        <p>鲲鹏十周年 · 十周年盲盒你来选</p>
        <a href="/">再看一次筛选工具 <span aria-hidden="true">→</span></a>
      </div>
    </footer>
  </main>
</template>
