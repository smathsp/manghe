import { handleEduApi } from '../../scripts/feishu-edu-vercel-api.mjs'

export default function handler(request, response) {
  return handleEduApi(request, response)
}
