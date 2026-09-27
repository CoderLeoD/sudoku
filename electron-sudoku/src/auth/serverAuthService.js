import { apiRequest, ApiRequestError } from '../services/apiClient.js'

export const SERVER_AUTH_SESSION_KEY = 'sudoku-server-session-v1'

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SERVER_AUTH_SESSION_KEY))
    return session?.token && session?.user ? session : null
  } catch {
    return null
  }
}

function saveSession(session) {
  localStorage.setItem(SERVER_AUTH_SESSION_KEY, JSON.stringify(session))
}

function clearSession() {
  localStorage.removeItem(SERVER_AUTH_SESSION_KEY)
}

export function getServerSessionToken() {
  return readSession()?.token ?? null
}

function saveAuthResponse(data) {
  const session = { token: data.token, expiresAt: data.expiresAt, user: data.user }
  saveSession(session)
  return data.user
}

/**
 * 与 localAuthService 保持相同方法签名的服务器认证适配器。
 * 仅当 VITE_DATA_SOURCE=server 时由 dataServices 选中。
 */
export const serverAuthService = {
  sessionStorageKey: SERVER_AUTH_SESSION_KEY,

  async getCurrentUser() {
    const session = readSession()
    if (!session) return null
    if (session.expiresAt && new Date(session.expiresAt).getTime() <= Date.now()) {
      clearSession()
      return null
    }

    try {
      const data = await apiRequest('/auth/me', { token: session.token })
      saveSession({ ...session, user: data.user, expiresAt: data.expiresAt })
      return data.user
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) clearSession()
      throw error
    }
  },

  async register(credentials) {
    const data = await apiRequest('/auth/register', {
      method: 'POST',
      body: { name: credentials.name, email: credentials.email, password: credentials.password },
    })
    return saveAuthResponse(data)
  },

  async login(credentials) {
    const data = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email: credentials.email, password: credentials.password },
    })
    return saveAuthResponse(data)
  },

  async logout() {
    const token = getServerSessionToken()
    clearSession()
    if (!token) return
    try {
      await apiRequest('/auth/logout', { method: 'POST', token })
    } catch (error) {
      // 本地令牌已经清除；网络失败不应阻止用户退出当前设备。
      console.warn('服务器注销请求未完成', error)
    }
  },
}
