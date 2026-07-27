import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ResultsPage from './ResultsPage.vue'
import ActivationPage from './ActivationPage.vue'
import First50Page from './First50Page.vue'
import ThanksPage from './ThanksPage.vue'
import MailboxPage from './MailboxPage.vue'
import VoidBoxPage from './VoidBoxPage.vue'
import ScreeningPage from './ScreeningPage.vue'

const normalizedPath = window.location.pathname.replace(/\/+$/, '')
const isResultsPage = normalizedPath === '/result'
  || normalizedPath.endsWith('/result/index.html')
const isActivationPage = normalizedPath === '/activate'
  || normalizedPath.endsWith('/activate/index.html')
const isFirst50Page = normalizedPath === '/first50'
  || normalizedPath.endsWith('/first50/index.html')
const isThanksPage = normalizedPath === '/thanks'
  || normalizedPath.endsWith('/thanks/index.html')
const isVoidBoxPage = normalizedPath === '/void-box'
  || normalizedPath.endsWith('/void-box/index.html')
const isMailboxDomainRoot = window.location.hostname === 'zd.smathsp.com'
  && (normalizedPath === '' || normalizedPath === '/index.html')
const isMailboxPage = isMailboxDomainRoot
  || normalizedPath === '/mail'
  || normalizedPath.endsWith('/mail/index.html')
const isScreeningPage = normalizedPath === '/screening'
  || normalizedPath.endsWith('/screening/index.html')

const RootComponent = isScreeningPage
  ? ScreeningPage
  : isMailboxPage
  ? MailboxPage
  : isVoidBoxPage
    ? VoidBoxPage
  : isThanksPage
    ? ThanksPage
  : isFirst50Page
    ? First50Page
    : isActivationPage
      ? ActivationPage
      : isResultsPage
        ? ResultsPage
        : App

if (RootComponent === MailboxPage) {
  document.title = '时光信箱｜把想说的话，一封封打开'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '走进时光信箱，打开一格信箱，让写给不同人的信一封封呈现在眼前。',
  )
}

if (RootComponent === ThanksPage) {
  document.title = '鲲鹏张导感恩名单'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '感谢每一位并肩同行、真诚支持鲲鹏张导的朋友。名单不分先后，真心同样珍贵。',
  )
}

if (RootComponent === VoidBoxPage) {
  document.title = '虚空大帝盲盒名单'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '虚空大帝盲盒 64 份订单登记名单，按订单时间排序。',
  )
}

if (RootComponent === ResultsPage) {
  document.title = '用户票选结果 - 十周年盲盒'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '十周年盲盒用户票选结果：传说、稀有、普通三个等级的人气设备榜单。',
  )
}

if (RootComponent === ActivationPage) {
  document.title = '天火卡激活流程'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '天火卡预约实名、开卡激活、购买流量及下单流程说明。',
  )
}

if (RootComponent === First50Page) {
  document.title = '天火卡首批 50 人名单'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '天火卡首批 50 人入选名单。',
  )
}

if (RootComponent === ScreeningPage) {
  document.title = '鲲鹏 CPE｜直播初筛'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '鲲鹏 CPE 直播初筛操作页面，展示申请原图并实时同步筛选结果。',
  )
}

createApp(RootComponent).mount('#app')
