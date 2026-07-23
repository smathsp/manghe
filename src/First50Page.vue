<script setup>
import { ref } from 'vue'

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

const exporting = ref(false)

const roundedRect = (context, x, y, width, height, radius) => {
  const r = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + width, y, x + width, y + height, r)
  context.arcTo(x + width, y + height, x, y + height, r)
  context.arcTo(x, y + height, x, y, r)
  context.arcTo(x, y, x + width, y, r)
  context.closePath()
}

const fitNameFont = (context, name, maxWidth) => {
  let size = 18
  do {
    context.font = `600 ${size}px "Segoe UI Symbol", "Arial Unicode MS", "Microsoft YaHei", sans-serif`
    if (context.measureText(name).width <= maxWidth) return
    size -= 1
  } while (size >= 12)
}

const exportPng = async () => {
  if (exporting.value) return
  exporting.value = true

  try {
    await document.fonts?.ready
    const width = 1080
    const height = 2440
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const context = canvas.getContext('2d')
    context.scale(scale, scale)

    context.fillStyle = '#070405'
    context.fillRect(0, 0, width, height)

    const heroGlow = context.createRadialGradient(width / 2, 20, 0, width / 2, 20, 620)
    heroGlow.addColorStop(0, 'rgba(255, 58, 25, .34)')
    heroGlow.addColorStop(.48, 'rgba(120, 18, 8, .12)')
    heroGlow.addColorStop(1, 'rgba(7, 4, 5, 0)')
    context.fillStyle = heroGlow
    context.fillRect(0, 0, width, 650)

    context.strokeStyle = 'rgba(255, 70, 27, .12)'
    context.lineWidth = 1
    for (let x = -200; x < width + 200; x += 54) {
      context.beginPath()
      context.moveTo(x, 0)
      context.lineTo(x + 390, 520)
      context.stroke()
    }

    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillStyle = '#e09a71'
    context.font = '600 13px "Microsoft YaHei", sans-serif'
    context.fillText('首批入选 · 荣耀公示', width / 2, 80)

    context.fillStyle = '#fff2e9'
    context.font = '800 70px "Microsoft YaHei", sans-serif'
    context.fillText('天火卡首批', width / 2, 166)

    const titleGradient = context.createLinearGradient(0, 210, 0, 310)
    titleGradient.addColorStop(0, '#fff2e8')
    titleGradient.addColorStop(.45, '#ffba92')
    titleGradient.addColorStop(1, '#ff4d20')
    context.fillStyle = titleGradient
    context.shadowColor = 'rgba(255, 48, 12, .28)'
    context.shadowBlur = 18
    context.font = '800 82px "Microsoft YaHei", sans-serif'
    context.fillText('50 人名单', width / 2, 258)
    context.shadowBlur = 0

    context.fillStyle = '#d2aaa0'
    context.font = '500 17px "Microsoft YaHei", sans-serif'
    context.fillText('不是名单上的一个数字，而是天火故事的第一批名字。', width / 2, 338)

    context.strokeStyle = 'rgba(255, 76, 30, .35)'
    context.beginPath()
    context.moveTo(120, 390)
    context.lineTo(960, 390)
    context.stroke()

    context.textAlign = 'left'
    context.fillStyle = '#f7ede7'
    context.font = '700 22px "Microsoft YaHei", sans-serif'
    context.fillText('荣耀席位 · FOUNDING 50', 42, 438)
    context.textAlign = 'right'
    context.fillStyle = '#a16c61'
    context.font = '500 13px "Microsoft YaHei", sans-serif'
    context.fillText('左列 01—25 · 右列 26—50', width - 42, 438)

    const columnGap = 16
    const marginX = 42
    const columnWidth = (width - marginX * 2 - columnGap) / 2
    const rowHeight = 62
    const rowGap = 7
    const rowStart = 472

    members.forEach((member, index) => {
      const column = index < 25 ? 0 : 1
      const row = index % 25
      const x = marginX + column * (columnWidth + columnGap)
      const y = rowStart + row * (rowHeight + rowGap)

      const rowGradient = context.createLinearGradient(x, y, x + columnWidth, y)
      rowGradient.addColorStop(0, 'rgba(255, 63, 24, .13)')
      rowGradient.addColorStop(.35, 'rgba(24, 9, 10, .96)')
      rowGradient.addColorStop(1, 'rgba(10, 7, 8, .98)')
      roundedRect(context, x, y, columnWidth, rowHeight, 9)
      context.fillStyle = rowGradient
      context.fill()
      context.strokeStyle = 'rgba(255, 73, 29, .32)'
      context.lineWidth = 1
      context.stroke()

      context.fillStyle = '#ff4a20'
      roundedRect(context, x, y, 4, rowHeight, 2)
      context.fill()

      context.textAlign = 'center'
      context.fillStyle = '#ff8250'
      context.font = 'italic 700 20px Georgia, serif'
      context.fillText(String(index + 1).padStart(2, '0'), x + 37, y + rowHeight / 2)

      context.strokeStyle = 'rgba(255, 76, 30, .2)'
      context.beginPath()
      context.moveTo(x + 70, y + 12)
      context.lineTo(x + 70, y + rowHeight - 12)
      context.stroke()

      context.textAlign = 'left'
      context.fillStyle = '#f5eee8'
      fitNameFont(context, member, columnWidth - 98)
      context.fillText(member, x + 86, y + rowHeight / 2, columnWidth - 98)
    })

    const endY = rowStart + 25 * (rowHeight + rowGap) + 28
    context.strokeStyle = 'rgba(255, 76, 30, .28)'
    context.beginPath()
    context.moveTo(310, endY)
    context.lineTo(450, endY)
    context.moveTo(630, endY)
    context.lineTo(770, endY)
    context.stroke()
    context.textAlign = 'center'
    context.fillStyle = '#8e5b52'
    context.font = '500 12px Georgia, serif'
    context.fillText('FOUNDING 50 · 与天火一起写下第一章', width / 2, endY)

    context.fillStyle = '#ffd0b2'
    context.font = '600 18px "Microsoft YaHei", sans-serif'
    context.fillText('感谢你，在故事开始的时候选择相信。', width / 2, height - 88)
    context.fillStyle = '#80564e'
    context.font = '500 11px "Microsoft YaHei", sans-serif'
    context.fillText('天火卡 · 致首批 50 位同行者', width / 2, height - 48)

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

    <div class="first50-export-surface">
      <section class="first50-hero">
        <div class="first50-embers" aria-hidden="true">
          <span v-for="spark in 18" :key="spark" :style="{ '--spark': spark }"></span>
        </div>
        <div class="first50-shell">
          <div class="first50-emblem" aria-hidden="true"><i></i><span><small>FOUNDING</small>50</span><i></i></div>
          <p class="first50-eyebrow">首批入选 · 荣耀公示</p>
          <h1>天火卡首批<br /><em>50 人名单</em></h1>
          <p class="first50-subtitle">不是名单上的一个数字，<br class="first50-mobile-break" />而是天火故事的第一批名字。</p>
          <div class="first50-stats" aria-label="名单统计">
            <span><strong>50</strong>创始席位</span>
            <i></i>
            <span><strong>FIRST</strong>首批同行</span>
          </div>
        </div>
      </section>

      <section class="first50-list-section">
        <div class="first50-shell first50-list-shell">
          <div class="first50-roster-frame">
            <div class="first50-frame-corner corner-tl"></div>
            <div class="first50-frame-corner corner-tr"></div>
            <div class="first50-list-heading">
              <div><span></span><strong>荣耀席位</strong><em>FOUNDING 50</em></div>
              <small>左列 01—25 · 右列 26—50</small>
            </div>

            <ol class="first50-list">
              <li v-for="(member, index) in members" :key="index">
                <span class="first50-index">{{ String(index + 1).padStart(2, '0') }}</span>
                <strong class="first50-name">{{ member }}</strong>
              </li>
            </ol>

            <div class="first50-endmark" aria-hidden="true"><span></span><i>FOUNDING 50</i><span></span></div>
          </div>

          <div class="first50-tribute">
            <span>致首批同行者</span>
            <strong>感谢你，在故事开始的时候选择相信。</strong>
            <p>从这一刻起，你的名字将和天火一起，写进第一章。</p>
          </div>
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
