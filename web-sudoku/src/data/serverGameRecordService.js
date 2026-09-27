import { getServerSessionToken } from '../auth/serverAuthService.js'
import { apiRequest } from '../services/apiClient.js'

function requireToken() {
  const token = getServerSessionToken()
  if (!token) throw new Error('请先登录服务器账户')
  return token
}

/** sudoku-server /api/games 的前端适配器。userId 参数仅用于兼容本地服务签名。 */
export const serverGameRecordService = {
  async create(_userId, input) {
    const data = await apiRequest('/games', { method: 'POST', token: requireToken(), body: input })
    return data.record
  },

  async update(_userId, id, changes) {
    const data = await apiRequest(`/games/${encodeURIComponent(id)}`, {
      method: 'PUT',
      token: requireToken(),
      body: changes,
    })
    return data.record
  },

  async list(_userId, { limit = 20, offset = 0 } = {}) {
    return apiRequest(`/games?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`, {
      token: requireToken(),
    })
  },

  async stats() {
    return apiRequest('/games/stats', { token: requireToken() })
  },
}
