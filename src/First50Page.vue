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
  let size = 15
  do {
    context.font = `600 ${size}px "Segoe UI Symbol", "Arial Unicode MS", "Microsoft YaHei", sans-serif`
    if (context.measureText(name).width <= maxWidth) return
    size -= 1
  } while (size >= 11)
}

const angledRect = (context, x, y, width, height, cut = 7) => {
  context.beginPath()
  context.moveTo(x + cut, y)
  context.lineTo(x + width - cut, y)
  context.lineTo(x + width, y + cut)
  context.lineTo(x + width, y + height - cut)
  context.lineTo(x + width - cut, y + height)
  context.lineTo(x + cut, y + height)
  context.lineTo(x, y + height - cut)
  context.lineTo(x, y + cut)
  context.closePath()
}

const drawFlame = (context, centerX, centerY, size) => {
  context.save()
  context.translate(centerX, centerY)
  const outer = context.createLinearGradient(0, -size / 2, 0, size / 2)
  outer.addColorStop(0, '#ffcf83')
  outer.addColorStop(.38, '#ff5c1e')
  outer.addColorStop(1, '#7d0904')
  context.fillStyle = outer
  context.shadowColor = 'rgba(255, 54, 13, .55)'
  context.shadowBlur = 22
  context.beginPath()
  context.moveTo(0, -size * .52)
  context.bezierCurveTo(size * .12, -size * .22, size * .43, -size * .08, size * .34, size * .22)
  context.bezierCurveTo(size * .27, size * .48, 0, size * .57, 0, size * .57)
  context.bezierCurveTo(0, size * .57, -size * .33, size * .46, -size * .35, size * .17)
  context.bezierCurveTo(-size * .37, -size * .05, -size * .14, -size * .17, -size * .08, -size * .34)
  context.bezierCurveTo(-size * .03, -size * .12, size * .06, -size * .04, size * .07, size * .14)
  context.bezierCurveTo(size * .2, -.02 * size, size * .12, -size * .3, 0, -size * .52)
  context.fill()
  context.shadowBlur = 0
  context.fillStyle = '#ffd9a0'
  context.beginPath()
  context.moveTo(0, -size * .08)
  context.bezierCurveTo(size * .18, size * .12, size * .14, size * .35, 0, size * .43)
  context.bezierCurveTo(-size * .16, size * .34, -size * .15, size * .12, 0, -size * .08)
  context.fill()
  context.restore()
}

const exportPng = async () => {
  if (exporting.value) return
  exporting.value = true

  try {
    await document.fonts?.ready
    const width = 1080
    const height = 1600
    const scale = 2
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const context = canvas.getContext('2d')
    context.scale(scale, scale)
    context.textBaseline = 'middle'

    context.fillStyle = '#050203'
    context.fillRect(0, 0, width, height)
    const topGlow = context.createRadialGradient(width / 2, 60, 0, width / 2, 60, 600)
    topGlow.addColorStop(0, 'rgba(255, 73, 22, .38)')
    topGlow.addColorStop(.42, 'rgba(124, 16, 6, .16)')
    topGlow.addColorStop(1, 'rgba(5, 2, 3, 0)')
    context.fillStyle = topGlow
    context.fillRect(0, 0, width, 650)

    for (let i = 0; i < 54; i += 1) {
      const x = (i * 193 + 47) % width
      const y = (i * 79 + 21) % 315
      const radius = i % 4 === 0 ? 1.8 : 1
      context.fillStyle = i % 3 === 0 ? 'rgba(255,160,83,.72)' : 'rgba(255,64,20,.48)'
      context.beginPath()
      context.arc(x, y, radius, 0, Math.PI * 2)
      context.fill()
    }

    context.strokeStyle = 'rgba(255, 88, 30, .28)'
    context.lineWidth = 1
    context.strokeRect(18.5, 18.5, width - 37, height - 37)
    context.strokeStyle = 'rgba(255, 132, 68, .7)'
    context.lineWidth = 2
    ;[[18, 18, 100, 18], [18, 18, 18, 100], [1062, 18, 980, 18], [1062, 18, 1062, 100], [18, 1582, 100, 1582], [18, 1582, 18, 1500], [1062, 1582, 980, 1582], [1062, 1582, 1062, 1500]].forEach(([x1, y1, x2, y2]) => {
      context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke()
    })

    drawFlame(context, width / 2, 57, 72)
    context.textAlign = 'center'
    context.fillStyle = '#d7865f'
    context.font = '600 11px Arial, sans-serif'
    context.fillText('TIANHUO · FOUNDING 50', width / 2, 103)

    const titleGradient = context.createLinearGradient(0, 115, 0, 188)
    titleGradient.addColorStop(0, '#fff8f1')
    titleGradient.addColorStop(.46, '#ffd1ae')
    titleGradient.addColorStop(1, '#ff6228')
    context.fillStyle = titleGradient
    context.shadowColor = 'rgba(255, 50, 10, .34)'
    context.shadowBlur = 19
    context.font = '900 61px "Microsoft YaHei", sans-serif'
    context.fillText('天火卡首批 50 人名单', width / 2, 151)
    context.shadowBlur = 0

    const ribbonX = 316
    const ribbonY = 201
    const ribbonW = 448
    const ribbonH = 46
    angledRect(context, ribbonX, ribbonY, ribbonW, ribbonH, 15)
    context.fillStyle = 'rgba(21, 6, 7, .94)'
    context.fill()
    context.strokeStyle = 'rgba(255, 109, 47, .65)'
    context.stroke()
    context.fillStyle = '#ffe4d0'
    context.font = '700 20px "Microsoft YaHei", sans-serif'
    context.fillText('首批入选 · 荣耀公示', width / 2, ribbonY + ribbonH / 2)

    context.fillStyle = '#c69789'
    context.font = '500 15px "Microsoft YaHei", sans-serif'
    context.fillText('不是名单上的一个数字，而是天火故事的第一批名字。', width / 2, 280)

    const frameX = 30
    const frameY = 315
    const frameW = 1020
    const frameH = 1196
    context.fillStyle = 'rgba(9, 4, 5, .84)'
    context.fillRect(frameX, frameY, frameW, frameH)
    context.strokeStyle = 'rgba(255, 83, 28, .34)'
    context.lineWidth = 1
    context.strokeRect(frameX + .5, frameY + .5, frameW - 1, frameH - 1)
    context.strokeStyle = 'rgba(255, 126, 62, .76)'
    context.lineWidth = 2
    context.beginPath(); context.moveTo(frameX, frameY + 72); context.lineTo(frameX, frameY); context.lineTo(frameX + 110, frameY); context.stroke()
    context.beginPath(); context.moveTo(frameX + frameW - 110, frameY); context.lineTo(frameX + frameW, frameY); context.lineTo(frameX + frameW, frameY + 72); context.stroke()

    context.textAlign = 'left'
    context.fillStyle = '#ffe4d1'
    context.font = '700 20px "Microsoft YaHei", sans-serif'
    context.fillText('荣耀席位', 48, 348)
    context.fillStyle = '#aa604d'
    context.font = '600 10px Arial, sans-serif'
    context.fillText('FOUNDING 50', 145, 348)
    context.textAlign = 'right'
    context.fillStyle = '#96635a'
    context.font = '500 11px "Microsoft YaHei", sans-serif'
    context.fillText('左列 01—25 · 右列 26—50', 1032, 348)

    context.strokeStyle = 'rgba(255, 85, 29, .18)'
    context.beginPath(); context.moveTo(48, 371); context.lineTo(1032, 371); context.stroke()
    context.strokeStyle = 'rgba(255, 91, 31, .16)'
    context.beginPath(); context.moveTo(width / 2, 382); context.lineTo(width / 2, 1480); context.stroke()

    const marginX = 44
    const columnGap = 14
    const columnWidth = (width - marginX * 2 - columnGap) / 2
    const rowHeight = 40
    const rowGap = 5
    const rowStart = 388

    members.forEach((member, index) => {
      const column = index < 25 ? 0 : 1
      const row = index % 25
      const x = marginX + column * (columnWidth + columnGap)
      const y = rowStart + row * (rowHeight + rowGap)
      const rowGradient = context.createLinearGradient(x, y, x + columnWidth, y)
      rowGradient.addColorStop(0, 'rgba(116, 21, 9, .54)')
      rowGradient.addColorStop(.24, 'rgba(29, 8, 8, .96)')
      rowGradient.addColorStop(1, 'rgba(8, 6, 7, .98)')
      angledRect(context, x, y, columnWidth, rowHeight, 6)
      context.fillStyle = rowGradient
      context.fill()
      context.strokeStyle = 'rgba(255, 79, 25, .34)'
      context.lineWidth = 1
      context.stroke()

      context.fillStyle = '#ff5521'
      context.fillRect(x, y + 5, 3, rowHeight - 10)
      context.textAlign = 'center'
      context.fillStyle = '#ff9a63'
      context.font = 'italic 700 15px Georgia, serif'
      context.fillText(String(index + 1).padStart(2, '0'), x + 29, y + rowHeight / 2)
      context.strokeStyle = 'rgba(255, 82, 26, .2)'
      context.beginPath(); context.moveTo(x + 55, y + 8); context.lineTo(x + 55, y + rowHeight - 8); context.stroke()
      context.textAlign = 'left'
      context.fillStyle = '#fff2e9'
      fitNameFont(context, member, columnWidth - 76)
      context.fillText(member, x + 68, y + rowHeight / 2, columnWidth - 76)
    })

    context.textAlign = 'center'
    context.fillStyle = '#ffcfac'
    context.font = '600 17px "Microsoft YaHei", sans-serif'
    context.fillText('感谢你，在故事开始的时候选择相信。', width / 2, 1542)
    context.fillStyle = '#88564d'
    context.font = '500 10px Arial, sans-serif'
    context.fillText('TIANHUO · WITH THE FOUNDING 50', width / 2, 1570)

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
