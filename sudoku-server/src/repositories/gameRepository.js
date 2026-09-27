function parseState(value) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function toGameRecord(row) {
  if (!row) return null
  return {
    id: row.id,
    userId: row.user_id,
    puzzleId: row.puzzle_id,
    difficulty: row.difficulty,
    status: row.status,
    elapsedSeconds: row.elapsed_seconds,
    mistakes: row.mistakes,
    hintsUsed: row.hints_used,
    state: parseState(row.state_json),
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function createGameRepository(database) {
  const createStatement = database.prepare(`
    INSERT INTO game_records (
      id, user_id, puzzle_id, difficulty, status, elapsed_seconds,
      mistakes, hints_used, state_json, started_at, completed_at, created_at, updated_at
    ) VALUES (
      @id, @userId, @puzzleId, @difficulty, @status, @elapsedSeconds,
      @mistakes, @hintsUsed, @stateJson, @startedAt, @completedAt, @createdAt, @updatedAt
    )
  `)
  const findByIdStatement = database.prepare('SELECT * FROM game_records WHERE id = ? AND user_id = ?')
  const listStatement = database.prepare(`
    SELECT * FROM game_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `)
  const countStatement = database.prepare('SELECT COUNT(*) AS total FROM game_records WHERE user_id = ?')
  const updateStatement = database.prepare(`
    UPDATE game_records SET
      puzzle_id = @puzzleId,
      difficulty = @difficulty,
      status = @status,
      elapsed_seconds = @elapsedSeconds,
      mistakes = @mistakes,
      hints_used = @hintsUsed,
      state_json = @stateJson,
      started_at = @startedAt,
      completed_at = @completedAt,
      updated_at = @updatedAt
    WHERE id = @id AND user_id = @userId
  `)
  const summaryStatement = database.prepare(`
    SELECT
      COUNT(*) AS total_games,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_games,
      MIN(CASE WHEN status = 'completed' THEN elapsed_seconds END) AS best_time_seconds,
      SUM(mistakes) AS total_mistakes,
      SUM(hints_used) AS total_hints_used
    FROM game_records
    WHERE user_id = ?
  `)
  const difficultyStatement = database.prepare(`
    SELECT
      difficulty,
      COUNT(*) AS total_games,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_games,
      MIN(CASE WHEN status = 'completed' THEN elapsed_seconds END) AS best_time_seconds
    FROM game_records
    WHERE user_id = ?
    GROUP BY difficulty
    ORDER BY difficulty
  `)

  return {
    create(record) {
      createStatement.run(record)
      return toGameRecord(findByIdStatement.get(record.id, record.userId))
    },

    findById(id, userId) {
      return toGameRecord(findByIdStatement.get(id, userId))
    },

    listByUser(userId, limit, offset) {
      return {
        items: listStatement.all(userId, limit, offset).map(toGameRecord),
        total: countStatement.get(userId).total,
      }
    },

    update(record) {
      const result = updateStatement.run(record)
      return result.changes ? toGameRecord(findByIdStatement.get(record.id, record.userId)) : null
    },

    getStats(userId) {
      const summary = summaryStatement.get(userId)
      const byDifficulty = difficultyStatement.all(userId).map((row) => ({
        difficulty: row.difficulty,
        totalGames: row.total_games,
        completedGames: row.completed_games,
        bestTimeSeconds: row.best_time_seconds,
      }))
      return {
        totalGames: summary.total_games,
        completedGames: summary.completed_games ?? 0,
        bestTimeSeconds: summary.best_time_seconds,
        totalMistakes: summary.total_mistakes ?? 0,
        totalHintsUsed: summary.total_hints_used ?? 0,
        byDifficulty,
      }
    },
  }
}
