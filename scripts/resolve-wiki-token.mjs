// Quick script to resolve a Feishu Wiki token to get the underlying Bitable Base Token.
// Usage: node scripts/resolve-wiki-token.mjs <FEISHU_APP_ID> <FEISHU_APP_SECRET> <WIKI_TOKEN>
import https from 'node:https'

const FEISHU_ORIGIN = 'https://open.feishu.cn'
const WIKI_TOKEN = 'Cam4wP3vQi78JAk46xfcLIkQnCb'

async function request(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, FEISHU_ORIGIN)
    const options = {
      method,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }
    if (token) options.headers.Authorization = `Bearer ${token}`

    const req = https.request(url, options, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        try {
          resolve({ status: res.statusCode, data: JSON.parse(text) })
        } catch {
          resolve({ status: res.statusCode, data: text })
        }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

async function main() {
  const appId = process.argv[2]
  const appSecret = process.argv[3]

  if (!appId || !appSecret) {
    console.error('Usage: node scripts/resolve-wiki-token.mjs <FEISHU_APP_ID> <FEISHU_APP_SECRET>')
    console.error('')
    console.error('Gets the Bitable Base Token from a Feishu Wiki document URL.')
    console.error('Example wiki URL: https://my.feishu.cn/wiki/Cam4wP3vQi78JAk46xfcLIkQnCb?table=...')
    console.error(`Wiki token to resolve: ${WIKI_TOKEN}`)
    process.exit(1)
  }

  console.log('Step 1: Getting tenant access token...')
  const authRes = await request('POST', '/open-apis/auth/v3/tenant_access_token/internal', null, {
    app_id: appId,
    app_secret: appSecret,
  })

  if (authRes.status !== 200 || !authRes.data?.tenant_access_token) {
    console.error('Auth failed:', JSON.stringify(authRes.data, null, 2))
    process.exit(1)
  }

  const tenantToken = authRes.data.tenant_access_token
  console.log('Token obtained.')

  // Step 2: Resolve wiki node
  console.log(`\nStep 2: Resolving wiki token "${WIKI_TOKEN}"...`)
  const nodeRes = await request('GET',
    `/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(WIKI_TOKEN)}`,
    tenantToken,
  )

  if (nodeRes.status !== 200 || !nodeRes.data?.data?.node) {
    console.error('Wiki node resolution failed:')
    console.error(`  Status: ${nodeRes.status}`)
    console.error(`  Response: ${JSON.stringify(nodeRes.data, null, 2)}`)
    console.error('\nPossible reasons:')
    console.error('  - The Feishu app does not have permission to access this Wiki')
    console.error('  - The Wiki token is incorrect')
    console.error('  - The app needs the "wiki:wiki:readonly" permission')
    process.exit(1)
  }

  const node = nodeRes.data.data.node
  console.log('Node info:')
  console.log(`  Title: ${node.title || '(unknown)'}`)
  console.log(`  Type: ${node.obj_type}`)
  console.log(`  Token: ${node.obj_token}`)
  console.log(`  URL: ${node.url || '(none)'}`)

  if (node.obj_type === 'bitable') {
    console.log(`\n✅ Base Token: ${node.obj_token}`)
    console.log(`✅ Table ID:   tblVqVj7G7jZclVT (from your URL)`)

    // Step 3: Try to list tables in the base to confirm access
    console.log('\nStep 3: Listing tables in the Bitable base...')
    const tablesRes = await request('GET',
      `/open-apis/bitable/v1/apps/${node.obj_token}/tables`,
      tenantToken,
    )

    if (tablesRes.status === 200 && tablesRes.data?.data?.items) {
      console.log('Tables found:')
      for (const table of tablesRes.data.data.items) {
        const marker = table.table_id === 'tblVqVj7G7jZclVT' ? ' ← YOUR TABLE' : ''
        console.log(`  - ${table.name} (${table.table_id})${marker}`)
      }
    } else {
      console.log('Could not list tables:', JSON.stringify(tablesRes.data, null, 2).slice(0, 400))
    }

    // Step 4: List fields in the target table
    console.log('\nStep 4: Listing fields in target table...')
    const fieldsRes = await request('GET',
      `/open-apis/bitable/v1/apps/${node.obj_token}/tables/tblVqVj7G7jZclVT/fields`,
      tenantToken,
    )

    if (fieldsRes.status === 200 && fieldsRes.data?.data?.items) {
      console.log('Fields:')
      for (const field of fieldsRes.data.data.items) {
        console.log(`  - ${field.field_name} (${field.type})`)
      }
    } else {
      console.log('Could not list fields:', JSON.stringify(fieldsRes.data, null, 2).slice(0, 400))
    }
  } else {
    console.log(`\n❌ The wiki node is of type "${node.obj_type}", not a Bitable.`)
    if (node.obj_type === 'doc') {
      console.log('   This is a document. Check if the Bitable is embedded inside.')
    }
  }
}

main().catch((err) => {
  console.error('Script error:', err.message)
  process.exit(1)
})
