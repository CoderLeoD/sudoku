import { localAuthService } from '../auth/localAuthService.js'
import { serverAuthService } from '../auth/serverAuthService.js'
import { localGameRecordService } from './localGameRecordService.js'
import { serverGameRecordService } from './serverGameRecordService.js'

const configuredSource = import.meta.env.VITE_DATA_SOURCE?.trim().toLowerCase() || 'local'

// 安全默认值始终是 local。拼错环境变量不会意外把本地数据请求发送到服务器。
export const DATA_SOURCE = configuredSource === 'server' ? 'server' : 'local'

if (!['local', 'server'].includes(configuredSource)) {
  console.warn(`未知的 VITE_DATA_SOURCE=${configuredSource}，已回退到 local`)
}

export const authService = DATA_SOURCE === 'server' ? serverAuthService : localAuthService
export const gameRecordService = DATA_SOURCE === 'server' ? serverGameRecordService : localGameRecordService
export const AUTH_SESSION_STORAGE_KEY = authService.sessionStorageKey
