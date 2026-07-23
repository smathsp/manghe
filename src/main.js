import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ResultsPage from './ResultsPage.vue'
import ActivationPage from './ActivationPage.vue'

const normalizedPath = window.location.pathname.replace(/\/+$/, '')
const isResultsPage = normalizedPath === '/result'
  || normalizedPath.endsWith('/result/index.html')
const isActivationPage = normalizedPath === '/activate'
  || normalizedPath.endsWith('/activate/index.html')

const RootComponent = isActivationPage
  ? ActivationPage
  : isResultsPage
    ? ResultsPage
    : App

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

createApp(RootComponent).mount('#app')
