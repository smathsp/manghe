import { createApp } from 'vue'
import { applyDocumentMetadata, resolveSiteRoute } from './app/routes.js'

const route = resolveSiteRoute(window.location)
const mountTarget = document.querySelector('#app')

applyDocumentMetadata(route)

route.load()
  .then((RootComponent) => createApp(RootComponent).mount(mountTarget))
  .catch((error) => {
    console.error('Unable to load page module', error)
    mountTarget.setAttribute('role', 'alert')
    mountTarget.textContent = '页面加载失败，请刷新后重试。'
  })
