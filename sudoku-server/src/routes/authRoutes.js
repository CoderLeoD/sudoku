import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'

export function createAuthRoutes({ authService, authenticate, authLimiter }) {
  const router = Router()

  router.post('/register', authLimiter, asyncHandler(async (request, response) => {
    const result = await authService.register(request.body)
    response.status(201).json({ data: result })
  }))

  router.post('/login', authLimiter, asyncHandler(async (request, response) => {
    const result = await authService.login(request.body)
    response.json({ data: result })
  }))

  router.get('/me', authenticate, (request, response) => {
    response.json({ data: { user: request.auth.user, expiresAt: request.auth.expiresAt } })
  })

  router.post('/logout', authenticate, asyncHandler(async (request, response) => {
    await authService.logout(request.auth.token)
    response.status(204).end()
  }))

  return router
}
