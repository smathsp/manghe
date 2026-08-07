// Import review results from CSV into Feishu Bitable
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import Papa from 'papaparse'

const BASE_TOKEN = 'EBjBbpH37arONtsnef7cE5DknSd'
const TABLE_ID = 'tblVqVj7G7jZclVT'

function norm(v) { return String(v ?? '').trim() }

function sh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 30000 })
}

async function main() {
  const csvPath = process.argv[2]
  if (!csvPath) { console.error('Usage: node scripts/import-reviews.mjs <csv>'); process.exit(1) }

  const text = readFileSync(csvPath, 'utf8')
  const { data: rows } = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' })
  console.log(`CSV: ${rows.length} rows`)

  console.log('Fetching Feishu records...')
  const r = JSON.parse(sh(
    `npx @larksuite/cli base +record-list --base-token ${BASE_TOKEN} --table-id ${TABLE_ID} --page-size 200 --format json --jq "{ids:.data.record_id_list,nums:[.data.data[]|.[0]]}"`
  ))
  const map = {}
  for (let i = 0; i < r.nums.length; i++) map[r.nums[i]] = r.ids[i]
  console.log(`Feishu: ${Object.keys(map).length} records`)

  let ok = 0, skip = 0
  for (const row of rows) {
    const num = norm(row['编号'])
    const res = norm(row['审核结果'])
    const note = norm(row['备注'])

    if (!num || !res) { skip++; continue }
    const rid = map[num]
    if (!rid) { console.log(`  #${num} - not in Feishu`); skip++; continue }
    const val = res === '同意' ? '同意' : res === '不同意' ? '不同意' : null
    if (!val) { skip++; continue }

    process.stdout.write(`  #${num} -> ${val}`)
    try {
      // Build JSON with proper escaping for Windows cmd
      const payload = JSON.stringify({ '审核结果': val, '审核备注': note })
      // Use double-quote escaping for cmd: " -> \"
      const escaped = payload.replace(/"/g, '\\"')
      sh(`npx @larksuite/cli base +record-upsert --base-token ${BASE_TOKEN} --table-id ${TABLE_ID} --record-id ${rid} --json "${escaped}"`)
      console.log(' OK')
      ok++
    } catch (e) {
      console.log(' FAIL')
    }
  }
  console.log(`\nDone: ${ok} updated, ${skip} skipped`)
}

main().catch(e => { console.error(e.message); process.exit(1) })
