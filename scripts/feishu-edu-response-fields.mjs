export const EDU_CURRENT_DISPLAY_FIELDS = Object.freeze([
  '编号',
  '你的学校名称是？',
  '你的抖音昵称',
  '你是属于以下哪一种分类？',
  '提交时间',
  '你的每月生活费档位',
  '人工初审结果',
  '人工初审备注',
  'EDU审核结果',
  'EDU审核备注',
  '请简单说明你申请EDU版本的主要原因',
  '你目前遇到的主要网络问题是什么？',
  '你目前遇到的主要网络问题是什么？-其他-补充内容',
  '你是通过什么渠道了解到鲲鹏的？哪一点让你考虑选择鲲鹏？请结合自己的使用需求简单说明。',
  '作为学生，你是怎么看张导的，有什么不足之处，可以怎么改善',
  '是否愿意参与后续产品体验反馈？',
  '信息确认',
])

export const EDU_RESERVED_DISPLAY_FIELDS = Object.freeze([
  '你的微信手机号',
  'EDU审核时间',
])

export const EDU_RECORD_RESPONSE_FIELDS = Object.freeze([
  ...EDU_CURRENT_DISPLAY_FIELDS,
  ...EDU_RESERVED_DISPLAY_FIELDS,
])

function hasValue(value) {
  if (value == null) return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

export function isEduInitialReviewed(record) {
  return hasValue(record?.fields?.['人工初审结果'])
}

export function isEduFinalReviewed(record) {
  return hasValue(record?.fields?.['EDU审核结果'])
}

export function isEduQueuePending(record) {
  return isEduInitialReviewed(record) && !isEduFinalReviewed(record)
}

export function eduQueueStats(records) {
  const eligible = records.filter(isEduInitialReviewed)
  const reviewed = eligible.filter(isEduFinalReviewed).length
  return {
    total: eligible.length,
    reviewed,
    pending: Math.max(0, eligible.length - reviewed),
  }
}

export function eduRecordResponse(record) {
  if (!record) return record
  const sourceFields = record.fields && typeof record.fields === 'object'
    ? record.fields
    : {}
  const fields = {}
  for (const fieldName of EDU_RECORD_RESPONSE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(sourceFields, fieldName)) {
      fields[fieldName] = fieldName === '你的微信手机号'
        ? (hasValue(sourceFields[fieldName]) ? '***' : '')
        : sourceFields[fieldName]
    }
  }
  return {
    record_id: String(record.record_id || ''),
    fields,
  }
}
