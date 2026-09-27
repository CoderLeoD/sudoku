import { Router } from 'express'
import { asyncHandler } from '../lib/asyncHandler.js'

export function createGameRoutes({ gameService, authenticate }) {
  const router = Router()
  router.use(authenticate)

  router.get('/', asyncHandler(async (request, response) => {
    response.json({ data: await gameService.list(request.auth.user.id, request.query) })
  }))

  router.get('/stats', asyncHandler(async (request, response) => {
    response.json({ data: await gameService.stats(request.auth.user.id) })
  }))

  router.post('/', asyncHandler(async (request, response) => {
    const record = await gameService.create(request.auth.user.id, request.body)
    response.status(201).json({ data: { record } })
  }))

  router.put('/:id', asyncHandler(async (request, response) => {
    const record = await gameService.update(request.auth.user.id, request.params.id, request.body)
    response.json({ data: { record } })
  }))

  return router
}
