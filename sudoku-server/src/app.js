import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import { ApiError } from './lib/ApiError.js'
import { asyncHandler } from './lib/asyncHandler.js'
import { createAuthenticateMiddleware } from './middleware/authenticate.js'
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js'
import { createAuthRoutes } from './routes/authRoutes.js'
import { createGameRoutes } from './routes/gameRoutes.js'
import { createAuthService } from './services/authService.js'
import { createGameService } from './services/gameService.js'

export function createApp({ storage, corsOrigins, sessionTtlDays, trustProxy = false }) {
  const app = express()
  const { accounts, users, sessions, games } = storage
  const authenticate = createAuthenticateMiddleware(sessions)
  const authService = createAuthService({ accounts, users, sessions, sessionTtlDays })
  const gameService = createGameService({ games })

  // 清理失败不阻止服务启动；后续请求仍会拒绝过期会话。
  Promise.resolve(sessions.deleteExpired(new Date().toISOString())).catch((error) => {
    console.error('清理过期会话失败', error)
  })

  app.disable('x-powered-by')
  if (trustProxy) app.set('trust proxy', 1)
  app.use(helmet())
  app.use(cors({
    origin(origin, callback) {
      if (!origin || corsOrigins.includes(origin)) return callback(null, true)
      return callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', '当前网站来源未被服务器允许'))
    },
  }))
  app.use(express.json({ limit: '128kb' }))

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_AUTH_ATTEMPTS', message: '登录或注册尝试过于频繁，请稍后再试' } },
  })

  app.get('/api/health', asyncHandler(async (_request, response) => {
    await storage.health()
    response.json({ data: { status: 'ok', service: 'sudoku-server', database: storage.driver, timestamp: new Date().toISOString() } })
  }))
  app.use('/api/auth', createAuthRoutes({ authService, authenticate, authLimiter }))
  app.use('/api/games', createGameRoutes({ gameService, authenticate }))
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
