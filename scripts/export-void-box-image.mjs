import { access } from 'node:fs/promises'
import path from 'node:path'
import puppeteer from 'puppeteer-core'

const projectRoot = path.resolve(import.meta.dirname, '..')
const outputPath = path.join(projectRoot, '虚空大帝盲盒名单-完整长图.png')
const pageUrl = process.env.VOID_BOX_PAGE_URL || 'http://127.0.0.1:5173/void-box/?export=1'
const browserPaths = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean)

let executablePath = ''
for (const candidate of browserPaths) {
  try {
    await access(candidate)
    executablePath = candidate
    break
  } catch {
    // Try the next locally installed browser.
  }
}

if (!executablePath) {
  throw new Error('未找到 Chrome 或 Edge，无法导出长图。')
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ['--hide-scrollbars', '--disable-dev-shm-usage', '--no-sandbox'],
})

try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 30000 })
  await page.screenshot({
    path: outputPath,
    type: 'png',
    fullPage: true,
    captureBeyondViewport: true,
  })
  console.log(outputPath)
} finally {
  await browser.close()
}
