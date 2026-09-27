import { randomUUID } from 'node:crypto'
import { ApiError } from '../lib/ApiError.js'
import { validateGameUpdate, validateNewGame } from '../validation/gameValidation.js'

export function createGameService({ games }) {
  return {
    async create(userId, input) {
      const data = validateNewGame(input)
      const now = new Date().toISOString()
      return games.create({
        id: randomUUID(),
        userId,
        ...data,
        createdAt: now,
        updatedAt: now,
      })
    },

    async update(userId, id, input) {
      const current = await games.findById(id, userId)
      if (!current) throw new ApiError(404, 'GAME_NOT_FOUND', '没有找到这条游戏记录')
      const data = validateGameUpdate(input, current)
      return games.update({
        id,
        userId,
        ...data,
        updatedAt: new Date().toISOString(),
      })
    },

    async list(userId, query) {
      const requestedLimit = Number.parseInt(query.limit ?? '20', 10)
      const requestedOffset = Number.parseInt(query.offset ?? '0', 10)
      const limit = Number.isInteger(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20
      const offset = Number.isInteger(requestedOffset) ? Math.max(requestedOffset, 0) : 0
      return { ...await games.listByUser(userId, limit, offset), limit, offset }
    },

    async stats(userId) {
      return games.getStats(userId)
    },
  }
}
