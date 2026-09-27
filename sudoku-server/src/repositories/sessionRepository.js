function toAuthenticatedUser(row) {
  if (!row) return null
  return {
    sessionId: row.session_id,
    expiresAt: row.expires_at,
    user: {
      id: row.user_id,
      name: row.name,
      email: row.email,
      createdAt: row.user_created_at,
    },
  }
}

export function createSessionRepository(database) {
  const createStatement = database.prepare(`
    INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
    VALUES (@id, @userId, @tokenHash, @expiresAt, @createdAt)
  `)
  const findStatement = database.prepare(`
    SELECT
      sessions.id AS session_id,
      sessions.expires_at,
      users.id AS user_id,
      users.name,
      users.email,
      users.created_at AS user_created_at
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ? AND sessions.expires_at > ?
  `)
  const deleteByTokenStatement = database.prepare('DELETE FROM sessions WHERE token_hash = ?')
  const deleteExpiredStatement = database.prepare('DELETE FROM sessions WHERE expires_at <= ?')

  return {
    create(session) {
      createStatement.run(session)
      return session
    },

    findActiveByTokenHash(tokenHash, now) {
      return toAuthenticatedUser(findStatement.get(tokenHash, now))
    },

    deleteByTokenHash(tokenHash) {
      return deleteByTokenStatement.run(tokenHash).changes > 0
    },

    deleteExpired(now) {
      return deleteExpiredStatement.run(now).changes
    },
  }
}
