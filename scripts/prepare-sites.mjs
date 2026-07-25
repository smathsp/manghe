import { cp, mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const distDirectory = new URL('../dist/', import.meta.url)
const clientDirectory = new URL('../dist/client/', import.meta.url)
const serverDirectory = new URL('../dist/server/', import.meta.url)

await mkdir(clientDirectory, { recursive: true })
await mkdir(serverDirectory, { recursive: true })

const entries = await readdir(distDirectory, { withFileTypes: true })

for (const entry of entries) {
  if (entry.name === 'client' || entry.name === 'server') continue
  await cp(
    new URL(entry.name, distDirectory),
    new URL(entry.name, clientDirectory),
    { recursive: true },
  )
}

await writeFile(
  join(fileURLToPath(serverDirectory), 'index.js'),
  `export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request)
  },
}
`,
  'utf8',
)
