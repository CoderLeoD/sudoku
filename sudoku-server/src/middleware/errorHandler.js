import { ApiError } from '../lib/ApiError.js'

export function notFoundHandler(request, _response, next) {
  next(new ApiError(404, 'NOT_FOUND', `接口不存在：${request.method} ${request.originalUrl}`))
}

export function errorHandler(error, _request, response, _next) {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return response.status(400).json({ error: { code: 'INVALID_JSON', message: '请求 JSON 格式不正确' } })
  }

  if (error instanceof ApiError) {
    const payload = { code: error.code, message: error.message }
    if (error.details !== undefined) payload.details = error.details
    return response.status(error.status).json({ error: payload })
  }

  console.error(error)
  return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } })
}
