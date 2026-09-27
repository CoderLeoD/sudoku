import { ApiError } from '../lib/ApiError.js'

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function validateEmail(email) {
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
    throw new ApiError(400, 'INVALID_EMAIL', '请输入有效的邮箱地址')
  }
}

export function validateName(value) {
  const name = typeof value === 'string' ? value.trim() : ''
  if (name.length < 2 || name.length > 24) {
    throw new ApiError(400, 'INVALID_NAME', '昵称需要包含 2–24 个字符')
  }
  return name
}

export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw new ApiError(400, 'INVALID_PASSWORD', '密码需要包含 8–128 个字符')
  }
  return value
}
