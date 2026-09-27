import { ApiError } from '../lib/ApiError.js'

const DIFFICULTIES = new Set(['easy', 'medium', 'hard'])
const STATUSES = new Set(['in_progress', 'completed', 'abandoned'])

function nonNegativeInteger(value, field, fallback) {
  if (value === undefined && fallback !== undefined) return fallback
  if (!Number.isInteger(value) || value < 0) {
    throw new ApiError(400, 'INVALID_GAME_DATA', `${field} 必须是非负整数`)
  }
  return value
}

function isoDate(value, field, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new ApiError(400, 'INVALID_GAME_DATA', `${field} 不是有效日期`)
  return date.toISOString()
}

function stateJson(value) {
  if (value === undefined || value === null) return null
  const serialized = JSON.stringify(value)
  if (serialized.length > 100_000) throw new ApiError(413, 'GAME_STATE_TOO_LARGE', '游戏状态不能超过 100 KB')
  return serialized
}

export function validateNewGame(body) {
  if (!DIFFICULTIES.has(body?.difficulty)) throw new ApiError(400, 'INVALID_DIFFICULTY', '无效的游戏难度')
  const status = body.status ?? 'in_progress'
  if (!STATUSES.has(status)) throw new ApiError(400, 'INVALID_STATUS', '无效的游戏状态')
  const now = new Date().toISOString()

  return {
    puzzleId: typeof body.puzzleId === 'string' ? body.puzzleId.slice(0, 100) : null,
    difficulty: body.difficulty,
    status,
    elapsedSeconds: nonNegativeInteger(body.elapsedSeconds, 'elapsedSeconds', 0),
    mistakes: nonNegativeInteger(body.mistakes, 'mistakes', 0),
    hintsUsed: nonNegativeInteger(body.hintsUsed, 'hintsUsed', 0),
    stateJson: stateJson(body.state),
    startedAt: isoDate(body.startedAt, 'startedAt', now),
    completedAt: status === 'completed' ? isoDate(body.completedAt, 'completedAt', now) : null,
  }
}

export function validateGameUpdate(body, current) {
  const merged = {
    ...current,
    ...body,
    state: body.state === undefined ? current.state : body.state,
  }
  return validateNewGame(merged)
}
