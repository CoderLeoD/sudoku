import { localDatabase } from './localDatabase.js'

function completedStats(records) {
  const completed = records.filter((record) => record.status === 'completed')
  const difficulties = ['easy', 'medium', 'hard']
  return {
    totalGames: records.length,
    completedGames: completed.length,
    bestTimeSeconds: completed.length ? Math.min(...completed.map((record) => record.elapsedSeconds)) : null,
    totalMistakes: records.reduce((total, record) => total + record.mistakes, 0),
    totalHintsUsed: records.reduce((total, record) => total + record.hintsUsed, 0),
    byDifficulty: difficulties.map((difficulty) => {
      const items = records.filter((record) => record.difficulty === difficulty)
      const finished = items.filter((record) => record.status === 'completed')
      return {
        difficulty,
        totalGames: items.length,
        completedGames: finished.length,
        bestTimeSeconds: finished.length ? Math.min(...finished.map((record) => record.elapsedSeconds)) : null,
      }
    }).filter((item) => item.totalGames > 0),
  }
}

export const localGameRecordService = {
  async create(userId, input) {
    const now = new Date().toISOString()
    const record = {
      id: crypto.randomUUID(),
      userId,
      puzzleId: input.puzzleId ?? null,
      difficulty: input.difficulty,
      status: input.status ?? 'in_progress',
      elapsedSeconds: input.elapsedSeconds ?? 0,
      mistakes: input.mistakes ?? 0,
      hintsUsed: input.hintsUsed ?? 0,
      state: input.state ?? null,
      startedAt: input.startedAt ?? now,
      completedAt: input.completedAt ?? null,
      createdAt: now,
      updatedAt: now,
    }
    await localDatabase.gameRecords.add(record)
    return record
  },

  async update(userId, id, changes) {
    const current = await localDatabase.gameRecords.getById(id)
    if (!current || current.userId !== userId) throw new Error('没有找到这条本地游戏记录')
    const record = { ...current, ...changes, id, userId, updatedAt: new Date().toISOString() }
    await localDatabase.gameRecords.put(record)
    return record
  },

  async list(userId, { limit = 20, offset = 0 } = {}) {
    const records = await localDatabase.gameRecords.getByUser(userId)
    const sorted = records.sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    return { items: sorted.slice(offset, offset + limit), total: sorted.length, limit, offset }
  },

  async stats(userId) {
    return completedStats(await localDatabase.gameRecords.getByUser(userId))
  },
}
