// Ngưỡng & cấu hình nghiệp vụ
export const EXPIRY_WARNING_DAYS = 30
export const STOCKTAKE_AUTO_APPROVE_VALUE_RATIO = 0.02 // 2% giá trị lô
export const SESSION_TIMEOUT_HOURS = 8

// Đơn vị chuẩn: gram
export const BASE_UNIT = 'gram'
export const GRAMS_PER_KG = 1000

// Error codes chuẩn cho domain
export const ERROR_CODES = {
  PRESCRIPTION_NOT_FOUND: 'PRESCRIPTION_NOT_FOUND',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  INTERACTION_CRITICAL: 'INTERACTION_CRITICAL',
  BATCH_EXPIRED: 'BATCH_EXPIRED',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  DUPLICATE_SUBMIT: 'DUPLICATE_SUBMIT',
} as const

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES]

export interface ActionResult<T = unknown> {
  data: T | null
  error: { code: ErrorCode; message: string } | null
}
