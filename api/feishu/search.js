import { handleApi } from '../../scripts/feishu-screening-api.mjs'

export default function handler(request, response) {
  return handleApi(request, response, {
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    accessKey: process.env.SCREENING_ACCESS_KEY,
    requireAccessKey: true,
  })
}
