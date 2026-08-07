import { execFile } from 'node:child_process'
import { readFile, writeFile, mkdir, unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const BASE_TOKEN = 'BO8PbV4F3aAN0msbHVQcW8Vangd'
const TABLE_ID = 'tblUhSp8cIYw5wHW'
const VIEW_ID = 'vewNhBX7cO'
const MAX_BODY_BYTES = 24 * 1024
const CACHE_TTL_MS = 20 * 1000

const SEARCH_FIELDS = [
  '编号',
  '你的微信手机号',
  '你的学校名称是？',
  '你的抖音昵称',
  '你是属于以下哪一种分类？',
  '提交时间',
  'EDU审核结果',
  'EDU审核时间',
  'EDU审核备注',
]

const REVIEW_RESULTS = new Set(['通过', '待补材料', '不通过'])
const ATTACHMENT_FIELDS = new Set([
  '【高中生】需要你的学生证',
  '真实校园证明',
  '【高中生】高考准考证',
])

let recordIndexCache = null

async function runLark(args) {
  const invocation = process.platform === 'win32'
    ? {
      file: process.execPath,
      args: [join(process.env.APPDATA || '', 'npm', 'node_modules', '@larksuite', 'cli', 'scripts', 'run.js'), ...args],
    }
    : { file: 'lark-cli', args }

  const { stdout } = await execFileAsync(invocation.file, invocation.args, {
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 24 * 1024 * 1024,
  })
  const payload = JSON.parse(stdout)
  if (!payload.ok) throw new Error(payload.error?.message || '飞书 CLI 请求失败')
  return payload
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

async function readJson(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error('请求内容过大')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new Error('请求格式不正确')
  }
}

function tableRows(payload) {
  const table = payload?.data || {}
  const fields = Array.isArray(table.fields) ? table.fields : []
  const rows = Array.isArray(table.data) ? table.data : []
  const recordIds = Array.isArray(table.record_id_list) ? table.record_id_list : []
  return rows.map((row, index) => ({
    record_id: recordIds[index] || '',
    fields: Object.fromEntries(fields.map((field, fieldIndex) => [field, row[fieldIndex] ?? null])),
  }))
}

function normalizeValue(value) {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(normalizeValue).filter(Boolean).join(' ')
  if (typeof value === 'object') {
    return normalizeValue(
      value.full_address
      ?? value.name
      ?? value.text
      ?? value.value
      ?? value.address
      ?? '',
    )
  }
  return String(value).trim()
}

function normalizeSearch(value) {
  return normalizeValue(value).toLowerCase().replace(/[\s\-—_（）()【】\[\]：:。,.，#]/g, '')
}

function maskPhone(value) {
  const phone = normalizeValue(value).replace(/\D/g, '')
  return phone ? '***' : ''
}

function recordNumber(record) {
  return Number(normalizeValue(record.fields?.['编号'])) || 0
}

function recordSummary(record) {
  const fields = record.fields || {}
  return {
    record_id: record.record_id,
    number: normalizeValue(fields['编号']) || '—',
    school: normalizeValue(fields['你的学校名称是？']) || '未填写学校',
    category: normalizeValue(fields['你是属于以下哪一种分类？']) || '未分类',
    phone: maskPhone(fields['你的微信手机号']),
    douyin: normalizeValue(fields['你的抖音昵称']),
    submitted_at: normalizeValue(fields['提交时间']),
    review_result: normalizeValue(fields['EDU审核结果']),
    review_time: normalizeValue(fields['EDU审核时间']),
    review_note: normalizeValue(fields['EDU审核备注']),
  }
}

async function listIndexRecords(force = false) {
  if (!force && recordIndexCache?.expiresAt > Date.now()) return recordIndexCache.records

  const records = []
  let offset = 0
  let hasMore = true
  while (hasMore && offset < 10000) {
    const args = [
      'base', '+record-list',
      '--base-token', BASE_TOKEN,
      '--table-id', TABLE_ID,
      '--view-id', VIEW_ID,
      '--offset', String(offset),
      '--limit', '200',
      '--format', 'json',
      '--as', 'user',
    ]
    for (const field of SEARCH_FIELDS) args.push('--field-id', field)
    const payload = await runLark(args)
    const page = tableRows(payload)
    records.push(...page)
    hasMore = payload.data?.has_more === true && page.length > 0
    offset += page.length
  }

  records.sort((a, b) => recordNumber(a) - recordNumber(b))
  recordIndexCache = { records, expiresAt: Date.now() + CACHE_TTL_MS }
  return records
}

function statsFor(records) {
  const reviewed = records.filter((record) => normalizeValue(record.fields?.['EDU审核结果'])).length
  return {
    total: records.length,
    reviewed,
    pending: Math.max(0, records.length - reviewed),
  }
}

async function searchRecords(type, rawQuery) {
  const query = normalizeSearch(rawQuery)
  if (type === 'phone' && !/^1[3-9]\d{9}$/.test(query)) throw new Error('请输入正确的 11 位手机号')
  if (type === 'douyin' && (!query || query.length > 50)) throw new Error('请输入 1–50 个字符的抖音昵称')
  if (!['phone', 'douyin'].includes(type)) throw new Error('查询类型不正确')
  const records = await listIndexRecords()
  const matches = records.filter((record) => {
    const fields = record.fields || {}
    if (type === 'phone') return normalizeSearch(fields['你的微信手机号']) === query
    return normalizeSearch(fields['你的抖音昵称']).includes(query)
  })
  return { records: matches.slice(0, 30).map(recordSummary), stats: statsFor(records) }
}

async function nextUnreviewed(rawAfterNumber = '') {
  const records = await listIndexRecords()
  const pending = records.filter((record) => !normalizeValue(record.fields?.['EDU审核结果']))
  if (!pending.length) return { record: null, stats: statsFor(records) }
  const afterNumber = Number(rawAfterNumber)
  const record = pending.find((item) => recordNumber(item) > afterNumber) || pending[0]
  return { record: recordSummary(record), stats: statsFor(records) }
}

async function getRecord(recordId) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  const payload = await runLark([
    'base', '+record-get',
    '--base-token', BASE_TOKEN,
    '--table-id', TABLE_ID,
    '--record-id', recordId,
    '--format', 'json',
    '--as', 'user',
  ])
  const record = tableRows(payload)[0]
  if (!record) throw new Error('没有找到这条申请记录')
  if (normalizeValue(record.fields?.['你的微信手机号'])) record.fields['你的微信手机号'] = '***'
  if (record.fields) delete record.fields['提交人']
  return record
}

function localDateTime() {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day} ${value.hour}:${value.minute}:${value.second}`
}

async function saveReview(recordId, result, rawNote) {
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!REVIEW_RESULTS.has(result)) throw new Error('审核结果不正确')
  const note = String(rawNote || '').trim()
  if (note.length > 500) throw new Error('审核备注不能超过 500 个字')

  const tempPath = join(tmpdir(), `manghe-edu-review-${Date.now()}-${Math.random().toString(16).slice(2)}.json`)
  await writeFile(tempPath, JSON.stringify({
    EDU审核结果: result,
    EDU审核时间: localDateTime(),
    EDU审核备注: note,
  }), 'utf8')

  try {
    await runLark([
      'base', '+record-upsert',
      '--base-token', BASE_TOKEN,
      '--table-id', TABLE_ID,
      '--record-id', recordId,
      '--json', `@${tempPath}`,
      '--as', 'user',
    ])
  } finally {
    await unlink(tempPath).catch(() => {})
  }

  recordIndexCache = null
  return { record_id: recordId, result, note, review_time: localDateTime() }
}

function safeImageExtension(filename) {
  const extension = extname(String(filename || '')).toLowerCase()
  return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension) ? extension : '.bin'
}

function contentTypeFor(extension) {
  return {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }[extension] || 'application/octet-stream'
}

async function downloadAttachment(body) {
  const recordId = String(body.recordId || '')
  const fieldName = String(body.fieldName || '')
  const fileToken = String(body.fileToken || '')
  if (!/^rec[a-z0-9]+$/i.test(recordId)) throw new Error('记录 ID 格式不正确')
  if (!ATTACHMENT_FIELDS.has(fieldName)) throw new Error('不允许读取这个附件字段')
  if (!/^[a-z0-9_-]{8,256}$/i.test(fileToken)) throw new Error('附件标识不正确')

  const record = await getRecord(recordId)
  const attachments = Array.isArray(record.fields?.[fieldName]) ? record.fields[fieldName] : []
  const attachment = attachments.find((item) => item?.file_token === fileToken)
  if (!attachment) throw new Error('附件不属于这条申请记录')

  const extension = safeImageExtension(attachment.name)
  const relativeDirectory = join('.openai', '.edu-attachment-cache')
  const directory = join(process.cwd(), relativeDirectory)
  const relativeOutput = join(relativeDirectory, `${fileToken}${extension}`)
  const output = join(process.cwd(), relativeOutput)
  await mkdir(directory, { recursive: true })
  await runLark([
    'base', '+record-download-attachment',
    '--base-token', BASE_TOKEN,
    '--table-id', TABLE_ID,
    '--record-id', recordId,
    '--file-token', fileToken,
    '--output', `./${relativeOutput.replaceAll('\\', '/')}`,
    '--overwrite',
    '--as', 'user',
  ])

  const bytes = await readFile(output)
  await unlink(output).catch(() => {})
  return { bytes, contentType: contentTypeFor(extension) }
}

async function handleApi(req, res) {
  try {
    if (req.method !== 'POST') {
      sendJson(res, 405, { message: '仅支持 POST 请求' })
      return
    }
    const body = await readJson(req)
    const pathname = new URL(req.url || '/', 'http://localhost').pathname

    if (pathname === '/api/edu/search') {
      sendJson(res, 200, await searchRecords(String(body.type || ''), body.query))
      return
    }
    if (pathname === '/api/edu/next') {
      sendJson(res, 200, await nextUnreviewed(body.afterNumber))
      return
    }
    if (pathname === '/api/edu/record') {
      sendJson(res, 200, { record: await getRecord(String(body.recordId || '')) })
      return
    }
    if (pathname === '/api/edu/review') {
      sendJson(res, 200, await saveReview(
        String(body.recordId || ''),
        String(body.result || ''),
        body.note,
      ))
      return
    }
    if (pathname === '/api/edu/attachment') {
      const attachment = await downloadAttachment(body)
      res.statusCode = 200
      res.setHeader('Content-Type', attachment.contentType)
      res.setHeader('Cache-Control', 'private, max-age=300')
      res.end(attachment.bytes)
      return
    }
    sendJson(res, 404, { message: '接口不存在' })
  } catch (error) {
    sendJson(res, 400, { message: error?.message || '本地飞书 CLI 请求失败' })
  }
}

function installMiddleware(server) {
  server.middlewares.use((req, res, next) => {
    if (!req.url?.startsWith('/api/edu/')) {
      next()
      return
    }
    handleApi(req, res)
  })
}

export default function feishuEduCliApi() {
  return {
    name: 'feishu-edu-cli-api',
    configureServer: installMiddleware,
    configurePreviewServer: installMiddleware,
  }
}
