import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import ResultsPage from './ResultsPage.vue'

const normalizedPath = window.location.pathname.replace(/\/+$/, '')
const isResultsPage = normalizedPath === '/result'
  || normalizedPath.endsWith('/result/index.html')

const RootComponent = isResultsPage
  ? ResultsPage
  : App

if (RootComponent === ResultsPage) {
  document.title = '用户票选结果 - 十周年盲盒'
  document.querySelector('meta[name="description"]')?.setAttribute(
    'content',
    '十周年盲盒用户票选结果：传说、稀有、普通三个等级的人气设备榜单。',
  )
}

createApp(RootComponent).mount('#app')
