import { ApiError } from '../lib/ApiError.js'
import { hashSessionToken } from '../lib/sessionToken.js'

export function createAuthenticateMiddleware(sessions) {
  return async (request, _response, next) => {
    try {
    const authorization = request.get('authorization') ?? ''
    const match = authorization.match(/^Bearer\s+(.+)$/i)
    if (!match) return next(new ApiError(401, 'AUTH_REQUIRED', '请先登录'))

    const token = match[1].trim()
    const authenticated = await sessions.findActiveByTokenHash(hashSessionToken(token), new Date().toISOString())
    if (!authenticated) return next(new ApiError(401, 'INVALID_SESSION', '登录状态已失效，请重新登录'))

    request.auth = { ...authenticated, token }
    return next()
    } catch (error) {
      return next(error)
    }
  }
}
