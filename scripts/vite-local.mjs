import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

function windowsProxy() {
  if (process.platform !== 'win32') return ''

  try {
    const key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'
    const enabled = execFileSync('reg.exe', ['query', key, '/v', 'ProxyEnable'], {
      encoding: 'utf8',
      windowsHide: true,
    })
    if (!/\b0x1\b/i.test(enabled)) return ''

    const output = execFileSync('reg.exe', ['query', key, '/v', 'ProxyServer'], {
      encoding: 'utf8',
      windowsHide: true,
    })
    const raw = output.match(/ProxyServer\s+REG_\w+\s+(.+)$/im)?.[1]?.trim() || ''
    const proxy = raw.split(';').find((item) => /^https=/i.test(item))?.split('=').slice(1).join('=')
      || raw.split(';').find((item) => /^http=/i.test(item))?.split('=').slice(1).join('=')
      || raw
    if (!proxy) return ''
    return /^[a-z]+:\/\//i.test(proxy) ? proxy : `http://${proxy}`
  } catch {
    return ''
  }
}

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const nodeArgs = [
  ...(process.allowedNodeEnvironmentFlags.has('--use-env-proxy') ? ['--use-env-proxy'] : []),
  viteBin,
  ...process.argv.slice(2),
]

let child
let activeProxy = ''
let restarting = false
let shuttingDown = false

function startVite() {
  const env = { ...process.env }
  activeProxy = env.HTTPS_PROXY || env.https_proxy || windowsProxy()
  if (activeProxy) {
    env.HTTPS_PROXY = activeProxy
    env.HTTP_PROXY = activeProxy
    env.NO_PROXY ||= '127.0.0.1,localhost'
  }

  child = spawn(process.execPath, nodeArgs, {
    env,
    stdio: 'inherit',
    windowsHide: false,
  })

  child.on('exit', (code, signal) => {
    if (restarting && !shuttingDown) {
      restarting = false
      startVite()
      return
    }
    if (!shuttingDown) {
      if (signal) process.kill(process.pid, signal)
      else process.exit(code ?? 1)
    }
  })
}

startVite()

const proxyWatcher = process.platform === 'win32'
  ? setInterval(() => {
      const latestProxy = windowsProxy()
      if (!latestProxy || latestProxy === activeProxy || restarting || shuttingDown) return
      restarting = true
      child.kill()
    }, 2000)
  : null

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shuttingDown = true
    if (proxyWatcher) clearInterval(proxyWatcher)
    child.kill(signal)
  })
}
