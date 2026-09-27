const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '/api'

export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '')

export class ApiRequestError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details } = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = code
    this.details = details
  }
}

/**
 * sudoku-server 的唯一 HTTP 请求入口。
 * 业务服务只传路径和令牌，未来增加刷新令牌、请求追踪或重试策略时集中修改这里。
 */
export async function apiRequest(path, { method = 'GET', token, body, signal } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (error) {
    throw new ApiRequestError('无法连接数独服务器，请检查网络或接口地址', { details: error?.message })
  }

  const payload = response.status === 204
    ? null
    : await response.json().catch(() => null)

  if (!response.ok) {
    throw new ApiRequestError(payload?.error?.message || `服务器请求失败（${response.status}）`, {
      status: response.status,
      code: payload?.error?.code || 'HTTP_ERROR',
      details: payload?.error?.details,
    })
  }

  return payload?.data ?? null
}
