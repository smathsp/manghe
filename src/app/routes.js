import { SITE_PAGES } from '../../config/site-routes.js'

const loadLegacyPage = (loadComponent) => Promise.all([
  import('../style.css'),
  loadComponent(),
]).then(([, componentModule]) => componentModule.default)

const PAGE_LOADERS = Object.freeze({
  home: () => Promise.all([
    import('../hub.css'),
    import('../HubPage.vue'),
  ]).then(([, componentModule]) => componentModule.default),
  blindboxVoting: () => loadLegacyPage(() => import('../App.vue')),
  results: () => loadLegacyPage(() => import('../ResultsPage.vue')),
  activation: () => loadLegacyPage(() => import('../ActivationPage.vue')),
  first50: () => loadLegacyPage(() => import('../First50Page.vue')),
  thanks: () => import('../ThanksPage.vue').then((module) => module.default),
  voidBox: () => import('../VoidBoxPage.vue').then((module) => module.default),
  mailbox: () => import('../MailboxPage.vue').then((module) => module.default),
  screening: () => import('../ScreeningPage.vue').then((module) => module.default),
  screeningLightboard: () => import('../LightboardScreeningPage.vue').then((module) => module.default),
  eduScreening: () => import('../EduScreeningPage.vue').then((module) => module.default),
  eduScreeningLive: () => import('../EduScreeningLivePage.vue').then((module) => module.default),
  blindboxReview: () => import('../BlindBoxReviewPage.vue').then((module) => module.default),
})

const PAGE_BY_ID = new Map(SITE_PAGES.map((page) => [page.id, page]))
const PAGE_ID_BY_PATH = new Map(SITE_PAGES.flatMap((page) => (
  page.paths.map((path) => [path, page.id])
)))

function normalizedPath(pathname) {
  return String(pathname || '/').replace(/\/+$/, '')
}

export function resolveSiteRoute({ pathname, hostname }) {
  const path = normalizedPath(pathname)
  const id = PAGE_ID_BY_PATH.get(path) || 'home'
  const page = PAGE_BY_ID.get(id)
  return { ...page, load: PAGE_LOADERS[id] }
}

export function applyDocumentMetadata(route) {
  document.title = route.title
  document.querySelector('meta[name="description"]')?.setAttribute('content', route.description)
}
