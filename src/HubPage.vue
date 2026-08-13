<script setup>
const publicProjects = [
  {
    number: '01',
    title: '十周年盲盒你来选',
    description: '拖拽设备，选出你心中的十周年盲盒配置。',
    href: '/blindbox/',
    label: '互动活动',
    accent: 'gold',
    featured: true,
  },
  {
    number: '02',
    title: '用户票选结果',
    description: '查看传说、稀有与普通三个等级的最终人气榜单。',
    href: '/result/',
    label: '结果公示',
    accent: 'violet',
  },
  {
    number: '03',
    title: '天火卡首批名单',
    description: '查看首批 50 位入选者与天火故事的第一批名字。',
    href: '/first50/',
    label: '名单公示',
    accent: 'red',
  },
  {
    number: '04',
    title: '天火卡激活流程',
    description: '从预约实名到开卡、购买流量和下单的完整说明。',
    href: '/activate/',
    label: '使用指南',
    accent: 'orange',
  },
  {
    number: '05',
    title: '时光信箱',
    description: '打开一格信箱，让写给不同人的信一封封呈现。',
    href: '/mail/',
    label: '特别企划',
    accent: 'blue',
  },
  {
    number: '06',
    title: '感恩名单',
    description: '记录每一位并肩同行、真诚支持的朋友。',
    href: '/thanks/',
    label: '荣光墙',
    accent: 'rose',
  },
  {
    number: '07',
    title: '虚空大帝盲盒名单',
    description: '查看 64 份盲盒订单的登记名录与纪念页面。',
    href: '/void-box/',
    label: '订单名录',
    accent: 'slate',
  },
]

const workbenches = [
  {
    number: 'A1',
    title: '天火卡申请审核',
    description: '集中查看申请问答、原图并同步筛选结果。',
    href: '/screening/',
    accent: 'red',
  },
  {
    number: 'A2',
    title: '灯牌截图审核',
    description: '专门核验粉丝灯牌截图并同步审核数据。',
    href: '/screening/lightboard/',
    accent: 'orange',
  },
  {
    number: 'A3',
    title: 'EDU 学生版审核',
    description: '按手机号或抖音昵称检索学生申请档案。',
    href: '/edu-screening/',
    accent: 'blue',
  },
  {
    number: 'A4',
    title: '鲲鹏匠人审核',
    description: '纵向查看匠人申请问答、工作台与作品原图。',
    href: '/artisan-screening/',
    accent: 'green',
  },
  {
    number: 'A5',
    title: '盲盒兑现审核',
    description: '逐条核对中奖用户的兑现和置换申请。',
    href: '/blindbox-review/',
    accent: 'violet',
  },
]
</script>

<template>
  <main class="hub-page">
    <header class="hub-nav">
      <a class="hub-brand" href="/" aria-label="返回项目入口首页">
        <span class="hub-brand-mark">KP</span>
        <span>
          <strong>鲲鹏张导</strong>
          <small>PROJECT DIRECTORY</small>
        </span>
      </a>
      <nav aria-label="首页分区导航">
        <a href="#projects">内容项目</a>
        <a href="#workbench">审核工具</a>
      </nav>
    </header>

    <section class="hub-hero" aria-labelledby="hub-title">
      <div class="hub-hero-copy">
        <p class="hub-eyebrow"><span></span> PROJECT DIRECTORY · 2026</p>
        <h1 id="hub-title">所有项目，<br><em>从这里开始。</em></h1>
        <p class="hub-intro">活动、名单、内容与审核工具，集中在一个清晰的入口。</p>
        <div class="hub-hero-actions">
          <a class="hub-primary-action" href="#projects">浏览全部项目 <span>↓</span></a>
          <span class="hub-count"><b>11</b> 个可用入口</span>
        </div>
      </div>
      <div class="hub-hero-index" aria-hidden="true">
        <span>INDEX</span>
        <strong>11</strong>
        <small>PROJECTS<br>ONLINE</small>
      </div>
    </section>

    <section id="projects" class="hub-section" aria-labelledby="projects-title">
      <header class="hub-section-heading">
        <div>
          <span class="hub-section-number">01</span>
          <div>
            <p>PUBLIC PROJECTS</p>
            <h2 id="projects-title">内容与公开项目</h2>
          </div>
        </div>
        <p>活动参与、结果公示与纪念内容</p>
      </header>

      <div class="hub-project-grid">
        <a
          v-for="project in publicProjects"
          :key="project.href"
          class="hub-project-card"
          :class="[`accent-${project.accent}`, { featured: project.featured }]"
          :href="project.href"
        >
          <div class="hub-card-topline">
            <span>{{ project.number }}</span>
            <small>{{ project.label }}</small>
          </div>
          <div class="hub-card-copy">
            <h3>{{ project.title }}</h3>
            <p>{{ project.description }}</p>
          </div>
          <span class="hub-card-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>

    <section id="workbench" class="hub-section hub-workbench" aria-labelledby="workbench-title">
      <header class="hub-section-heading">
        <div>
          <span class="hub-section-number">02</span>
          <div>
            <p>REVIEW WORKBENCH</p>
            <h2 id="workbench-title">审核工作台</h2>
          </div>
        </div>
        <p>审核入口使用各自的访问密码保护</p>
      </header>

      <div class="hub-tool-list">
        <a
          v-for="tool in workbenches"
          :key="tool.href"
          class="hub-tool-row"
          :class="`accent-${tool.accent}`"
          :href="tool.href"
        >
          <span class="hub-tool-number">{{ tool.number }}</span>
          <span class="hub-tool-status"><i></i> AVAILABLE</span>
          <span class="hub-tool-copy">
            <strong>{{ tool.title }}</strong>
            <small>{{ tool.description }}</small>
          </span>
          <span class="hub-tool-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <footer class="hub-footer">
      <span>鲲鹏张导 · PROJECT DIRECTORY</span>
      <span>持续记录每一个值得被看见的项目</span>
    </footer>
  </main>
</template>
