<script setup>
import { nextTick, ref } from 'vue'

const members = [
  'qf',
  '习惯',
  'ㅤㅤㅤㅤ',
  'A  。勾机',
  '叵恒',
  'wuaq',
  '红火聚财来',
  '侯佳鑫',
  '明扬',
  'ㅤA  ㅤ ㅤ ㅤ  ㅤ ㅤ ㅤ  ㅤ 桃子',
  '໑ຼₒ₂⁶ღ᭄ꫛ王꧔ꦿ᭄',
  '豪',
  '青年📱小朱₅₂₀',
  '阳光小玖',
  '享耳',
  'Drunk',
  '庆云',
  '@一二三',
  '旋沫',
  '猫かか',
  '～清心～',
  '王勇',
  '蒋了个蒋💫',
  '热得快',
  '.',
  '张雨强',
  'i还没睡醒i',
  'A-永浩一Princess dress',
  '鄭花路廿號¹⁵⁸',
  '期待',
  '□□□□',
  '华灿',
  '余温゛',
  '王',
  'Mortal',
  '拾友叁',
  '时逝',
  '起名字很难的',
  '清楚人情长～异难还',
  '汐颜兮梦',
  '亿',
  '【干净】',
  '温柔扑了空',
  '林解',
  '信',
  '孙甲',
  'Ning',
  'Dꫀડᴛʀꪮꪗ .（余悸 ）',
  '瑞亚Rhea',
  '人生无常',
]

const exportTarget = ref(null)
const exporting = ref(false)

const loadSvgAsImage = (url) => new Promise((resolve, reject) => {
  const image = new Image()
  image.onload = () => resolve(image)
  image.onerror = reject
  image.src = url
})

const exportPng = async () => {
  if (!exportTarget.value || exporting.value) return
  exporting.value = true

  try {
    await document.fonts?.ready
    await nextTick()

    const target = exportTarget.value
    const width = 1080
    const css = [...document.styleSheets]
      .map(sheet => {
        try {
          return [...sheet.cssRules].map(rule => rule.cssText).join('\n')
        } catch {
          return ''
        }
      })
      .join('\n')
      .replaceAll(']]>', ']]]]><![CDATA[>')

    const clone = target.cloneNode(true)
    clone.classList.add('first50-export-clone')
    clone.style.width = `${width}px`
    const stage = document.createElement('div')
    stage.className = 'first50-export-stage'
    stage.appendChild(clone)
    document.body.appendChild(stage)
    await new Promise(resolve => requestAnimationFrame(resolve))
    const height = Math.ceil(clone.scrollHeight)
    const cloneMarkup = clone.outerHTML
    stage.remove()

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
        <foreignObject width="100%" height="100%">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;background:#070405;">
            <style><![CDATA[${css}]]></style>
            ${cloneMarkup}
          </div>
        </foreignObject>
      </svg>`

    const svgUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
    const image = await loadSvgAsImage(svgUrl)
    const canvas = document.createElement('canvas')
    canvas.width = width * 2
    canvas.height = height * 2
    const context = canvas.getContext('2d')
    context.scale(2, 2)
    context.drawImage(image, 0, 0, width, height)
    URL.revokeObjectURL(svgUrl)

    const pngBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
    if (!pngBlob) throw new Error('PNG export failed')
    const downloadUrl = URL.createObjectURL(pngBlob)
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = '天火卡首批50人名单-2x.png'
    link.click()
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000)
  } catch (error) {
    console.error(error)
    window.alert('导出失败，请刷新页面后重试')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <main class="first50-page">
    <header class="first50-topbar">
      <div class="first50-shell first50-topbar-inner">
        <a class="first50-brand" href="/" aria-label="返回首页">
          <span class="first50-brand-mark">火</span>
          <span><strong>天火卡</strong><small>FIRST WAVE</small></span>
        </a>
        <div class="first50-actions">
          <button class="first50-export-btn" type="button" :disabled="exporting" @click="exportPng">
            <span aria-hidden="true">↓</span>{{ exporting ? '正在生成…' : '导出 PNG · 2×' }}
          </button>
          <a class="first50-back" href="/">返回首页</a>
        </div>
      </div>
    </header>

    <div ref="exportTarget" class="first50-export-surface">
      <section class="first50-hero">
        <div class="first50-shell">
          <div class="first50-emblem" aria-hidden="true"><i></i><span>50</span><i></i></div>
          <p class="first50-eyebrow">TIANHUO · FIRST WAVE</p>
          <h1>天火卡首批<br /><em>50 人名单</em></h1>
          <p class="first50-subtitle">首批入选名单 · 按名单顺序展示</p>
          <div class="first50-stats" aria-label="名单统计">
            <span><strong>50</strong>入选人数</span>
            <i></i>
            <span><strong>01—50</strong>名单序号</span>
          </div>
        </div>
      </section>

      <section class="first50-list-section">
        <div class="first50-shell first50-list-shell">
          <div class="first50-list-heading">
            <div><span></span><strong>首批名单</strong></div>
            <small>左列 01—25 · 右列 26—50</small>
          </div>

          <ol class="first50-list">
            <li v-for="(member, index) in members" :key="index">
              <span class="first50-index">{{ String(index + 1).padStart(2, '0') }}</span>
              <strong class="first50-name">{{ member }}</strong>
            </li>
          </ol>

          <div class="first50-endmark" aria-hidden="true"><span></span><i>END · 50</i><span></span></div>
        </div>
      </section>
    </div>

    <footer class="first50-footer">
      <div class="first50-shell">
        <p>天火卡 · 首批名单</p>
        <a href="#">回到顶部 ↑</a>
      </div>
    </footer>
  </main>
</template>
