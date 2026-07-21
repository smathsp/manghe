import { cp, mkdir, writeFile } from 'node:fs/promises'

await mkdir('dist/client', { recursive: true })
await mkdir('dist/server', { recursive: true })
await cp('dist/assets', 'dist/client/assets', { recursive: true })
await cp('dist/images', 'dist/client/images', { recursive: true })

for (const file of ['index.html', 'favicon.svg', 'icons.svg', 'og.png']) {
  await cp(`dist/${file}`, `dist/client/${file}`)
}

await writeFile('dist/server/index.js', `export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request)
    if (response.status !== 404 || request.method !== 'GET') return response

    const url = new URL(request.url)
    url.pathname = '/'
    return env.ASSETS.fetch(new Request(url, request))
  },
}\n`)
