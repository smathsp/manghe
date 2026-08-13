import { handleArtisanApi } from '../../scripts/feishu-artisan-api.mjs'

export default function handler(request, response) {
  return handleArtisanApi(request, response, {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    accessKey: process.env.ARTISAN_SCREENING_ACCESS_KEY || process.env.SCREENING_ACCESS_KEY,
    baseToken: process.env.ARTISAN_BASE_TOKEN,
    tableId: process.env.ARTISAN_TABLE_ID,
    requireAccessKey: true,
  })
}
