import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import Papa from 'papaparse'

const cli = 'C:/Users/Administrator/AppData/Roaming/npm/node_modules/@larksuite/cli/scripts/run.js'
const baseToken = 'NBO0b2rrbaS0sws8YTFc4XlOnlf'
const tableId = 'tblVnUXJQUgpjcMi'
const csvPath = 'E:/WXfile/xwechat_files/wxid_ilacsfmy7zxa22_9f6e/msg/file/2026-07/天火卡申请表_公开问卷_8_直播筛选结果_44人_20260729_191222.csv'

function parseCliJson(output) {
  const marker = output.indexOf('{\n  "ok"')
  const start = marker >= 0 ? marker : output.indexOf('{')
  if (start < 0) throw new Error(`CLI 未返回 JSON：${output.slice(0, 300)}`)
  return JSON.parse(output.slice(start))
}

function cliCall(args, attempts = 4) {
  let lastError
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return execFileSync(process.execPath, [cli, ...args], {
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } catch (error) {
      lastError = error
      const detail = `${error.stdout || ''}\n${error.stderr || ''}`
      if (!detail.includes('800004135') && !detail.includes('1254291')) break
      const until = Date.now() + attempt * 700
      while (Date.now() < until) {}
    }
  }
  throw new Error(`${lastError?.stdout || ''}\n${lastError?.stderr || ''}`)
}

function firstValue(value) {
  return Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '')
}

function normalizePhone(value) {
  return String(value ?? '').match(/1[3-9]\d{9}/)?.[0] || String(value ?? '').trim()
}

function normalizeTime(value) {
  const match = String(value ?? '').trim().match(
    /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/,
  )
  if (!match) throw new Error(`无法识别审核时间：${value}`)
  const [, year, month, day, hour, minute, second] = match
  const pad = (part) => String(part).padStart(2, '0')
  return `${year}-${pad(month)}-${pad(day)} ${pad(hour)}:${pad(minute)}:${pad(second)}`
}

const parsed = Papa.parse(readFileSync(csvPath, 'utf8').replace(/^\uFEFF/, ''), {
  header: true,
  skipEmptyLines: true,
})
if (parsed.errors.length) {
  throw new Error(`CSV 解析失败：${parsed.errors.map((item) => item.message).join('；')}`)
}

const csvRows = parsed.data.map((row) => ({
  number: String(row['编号'] ?? '').trim(),
  phone: String(row['微信注册手机号'] ?? '').trim(),
  nickname: String(row['昵称'] ?? '').trim(),
  result: String(row['直播筛选结果'] ?? '').trim(),
  time: normalizeTime(row['直播筛选时间']),
}))

if (csvRows.length !== 44) throw new Error(`CSV 记录数不是 44：${csvRows.length}`)
if (csvRows.some((row) => !['通过', '不通过'].includes(row.result))) {
  throw new Error('CSV 中存在非“通过/不通过”的审核结果')
}

const targetRows = []
for (let offset = 0; ; offset += 200) {
  const result = parseCliJson(
    cliCall([
      'base',
      '+record-list',
      '--base-token',
      baseToken,
      '--table-id',
      tableId,
      '--offset',
      String(offset),
      '--limit',
      '200',
      '--field-id',
      'fldfl4Uosd',
      '--field-id',
      'fldwjCjowp',
      '--field-id',
      'fldegVUPLB',
      '--field-id',
      'fldXRngw4g',
      '--as',
      'user',
      '--format',
      'json',
    ]),
  ).data
  const index = Object.fromEntries(result.field_id_list.map((id, position) => [id, position]))
  for (let position = 0; position < result.data.length; position += 1) {
    const values = result.data[position]
    targetRows.push({
      recordId: result.record_id_list[position],
      number: String(values[index.fldfl4Uosd] ?? '').trim(),
      phone: String(values[index.fldwjCjowp] ?? '').trim(),
      result: firstValue(values[index.fldegVUPLB]).trim(),
      time: String(values[index.fldXRngw4g] ?? '').trim(),
    })
  }
  if (!result.has_more) break
}

const targetByNumber = new Map()
for (const row of targetRows) {
  if (!targetByNumber.has(row.number)) targetByNumber.set(row.number, [])
  targetByNumber.get(row.number).push(row)
}

const updates = {}
const skippedExisting = []
for (const csvRow of csvRows) {
  const matches = targetByNumber.get(csvRow.number) || []
  if (matches.length !== 1) {
    throw new Error(`编号 ${csvRow.number} 匹配到 ${matches.length} 条飞书记录`)
  }
  const target = matches[0]
  if (normalizePhone(target.phone) !== normalizePhone(csvRow.phone)) {
    throw new Error(`编号 ${csvRow.number} 手机号不一致：CSV=${csvRow.phone}，飞书=${target.phone}`)
  }
  if (target.result) {
    skippedExisting.push({
      number: csvRow.number,
      existingResult: target.result,
      existingTime: target.time,
      csvResult: csvRow.result,
      csvTime: csvRow.time,
    })
    continue
  }
  updates[target.recordId] = {
    '直播筛选结果': csvRow.result,
    '直播筛选时间': csvRow.time,
  }
}

const updateIds = Object.keys(updates)
if (updateIds.length) {
  parseCliJson(
    cliCall([
      'base',
      '+record-batch-update',
      '--base-token',
      baseToken,
      '--table-id',
      tableId,
      '--json',
      JSON.stringify({ update_records: updates }),
      '--as',
      'user',
      '--format',
      'json',
    ]),
  )
}

const verified = updateIds.length
  ? parseCliJson(
      cliCall([
        'base',
        '+record-get',
        '--base-token',
        baseToken,
        '--table-id',
        tableId,
        ...updateIds.flatMap((recordId) => ['--record-id', recordId]),
        '--field-id',
        'fldfl4Uosd',
        '--field-id',
        'fldegVUPLB',
        '--field-id',
        'fldXRngw4g',
        '--as',
        'user',
        '--format',
        'json',
      ]),
    ).data
  : { data: [], field_id_list: [], record_id_list: [] }

const fieldIndex = Object.fromEntries(
  (verified.field_id_list || []).map((id, position) => [id, position]),
)
const failures = []
for (let position = 0; position < verified.data.length; position += 1) {
  const recordId = verified.record_id_list[position]
  const values = verified.data[position]
  const expected = updates[recordId]
  const result = firstValue(values[fieldIndex.fldegVUPLB]).trim()
  const time = String(values[fieldIndex.fldXRngw4g] ?? '').trim()
  if (result !== expected['直播筛选结果'] || time !== expected['直播筛选时间']) {
    failures.push({ recordId, expected, actual: { result, time } })
  }
}
if (verified.data.length !== updateIds.length || failures.length) {
  throw new Error(`回读核验失败：${JSON.stringify({ expected: updateIds.length, actual: verified.data.length, failures })}`)
}

const resultCounts = Object.values(updates).reduce((counts, fields) => {
  const result = fields['直播筛选结果']
  counts[result] = (counts[result] || 0) + 1
  return counts
}, {})
const skippedConflicts = skippedExisting.filter((item) => (
  item.existingResult !== item.csvResult || item.existingTime !== item.csvTime
))

console.log(JSON.stringify({
  csvRecords: csvRows.length,
  added: updateIds.length,
  skippedExisting: skippedExisting.length,
  skippedConflicts,
  resultCounts,
  verified: verified.data.length,
}, null, 2))
