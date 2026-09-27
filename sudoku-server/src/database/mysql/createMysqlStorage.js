import fs from 'node:fs'

/**
 * MySQL 预留适配器。
 *
 * 此文件实现与 createSqliteStorage 完全一致的存储接口。只有当
 * DATABASE_DRIVER=mysql 时才会由 createStorage 动态加载和建立连接。
 * 默认 SQLite 模式不会触碰这里的连接配置。
 */

function toUser(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.password_hash,
    passwordSalt: row.password_salt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function parseState(value) {
  if (!value) return null
  try {
    return typeof value === 'string' ? JSON.parse(value) : value
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

async function first(connection, sql, parameters = []) {
  const [rows] = await connection.execute(sql, parameters)
  return rows[0] ?? null
}

async function verifySchema(pool, databaseName) {
  const [rows] = await pool.execute(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = ? AND table_name IN ('users', 'sessions', 'game_records')`,
    [databaseName],
  )
  const tables = new Set(rows.map((row) => row.TABLE_NAME ?? row.table_name))
  const missing = ['users', 'sessions', 'game_records'].filter((table) => !tables.has(table))
  if (missing.length) {
    const error = new Error(`MySQL 缺少数据表：${missing.join(', ')}；请先执行 src/database/mysql/schema.sql`)
    error.code = 'MYSQL_SCHEMA_MISSING'
    throw error
  }
}

export async function createMysqlStorage(configuration) {
  const { createPool } = await import('mysql2/promise')
  const pool = createPool({
    host: configuration.host,
    port: configuration.port,
    user: configuration.user,
    password: configuration.password,
    database: configuration.database,
    connectionLimit: configuration.connectionLimit,
    waitForConnections: true,
    queueLimit: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    ssl: configuration.ssl
      ? {
          minVersion: 'TLSv1.2',
          // 云数据库或私有 CA 可通过环境变量提供证书，不要把证书内容写进源码。
          ...(configuration.sslCaPath ? { ca: fs.readFileSync(configuration.sslCaPath) } : {}),
        }
      : undefined,
  })

  try {
    await pool.query('SELECT 1')
    await verifySchema(pool, configuration.database)
  } catch (error) {
    await pool.end()
    throw error
  }

  const users = {
    async findById(id) {
      return toUser(await first(pool, 'SELECT * FROM users WHERE id = ?', [id]))
    },

    async findByEmail(email) {
      return toUser(await first(pool, 'SELECT * FROM users WHERE email = ?', [email]))
    },

    async create(user) {
      await pool.execute(
        `INSERT INTO users (id, name, email, password_hash, password_salt, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.id, user.name, user.email, user.passwordHash, user.passwordSalt, user.createdAt, user.updatedAt],
      )
      return user
    },
  }

  const sessions = {
    async create(session) {
      await pool.execute(
        `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt],
      )
      return session
    },

    async findActiveByTokenHash(tokenHash, now) {
      const row = await first(
        pool,
        `SELECT
           sessions.id AS session_id,
           sessions.expires_at,
           users.id AS user_id,
           users.name,
           users.email,
           users.created_at AS user_created_at
         FROM sessions
         JOIN users ON users.id = sessions.user_id
         WHERE sessions.token_hash = ? AND sessions.expires_at > ?`,
        [tokenHash, now],
      )
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
    },

    async deleteByTokenHash(tokenHash) {
      const [result] = await pool.execute('DELETE FROM sessions WHERE token_hash = ?', [tokenHash])
      return result.affectedRows > 0
    },

    async deleteExpired(now) {
      const [result] = await pool.execute('DELETE FROM sessions WHERE expires_at <= ?', [now])
      return result.affectedRows
    },
  }

  const games = {
    async create(record) {
      await pool.execute(
        `INSERT INTO game_records (
           id, user_id, puzzle_id, difficulty, status, elapsed_seconds,
           mistakes, hints_used, state_json, started_at, completed_at, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          record.id, record.userId, record.puzzleId, record.difficulty, record.status,
          record.elapsedSeconds, record.mistakes, record.hintsUsed, record.stateJson,
          record.startedAt, record.completedAt, record.createdAt, record.updatedAt,
        ],
      )
      return this.findById(record.id, record.userId)
    },

    async findById(id, userId) {
      return toGameRecord(await first(pool, 'SELECT * FROM game_records WHERE id = ? AND user_id = ?', [id, userId]))
    },

    async listByUser(userId, limit, offset) {
      const [rows] = await pool.execute(
        `SELECT * FROM game_records
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset],
      )
      const count = await first(pool, 'SELECT COUNT(*) AS total FROM game_records WHERE user_id = ?', [userId])
      return { items: rows.map(toGameRecord), total: Number(count.total) }
    },

    async update(record) {
      const [result] = await pool.execute(
        `UPDATE game_records SET
           puzzle_id = ?, difficulty = ?, status = ?, elapsed_seconds = ?, mistakes = ?,
           hints_used = ?, state_json = ?, started_at = ?, completed_at = ?, updated_at = ?
         WHERE id = ? AND user_id = ?`,
        [
          record.puzzleId, record.difficulty, record.status, record.elapsedSeconds,
          record.mistakes, record.hintsUsed, record.stateJson, record.startedAt,
          record.completedAt, record.updatedAt, record.id, record.userId,
        ],
      )
      return result.affectedRows ? this.findById(record.id, record.userId) : null
    },

    async getStats(userId) {
      const summary = await first(
        pool,
        `SELECT
           COUNT(*) AS total_games,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_games,
           MIN(CASE WHEN status = 'completed' THEN elapsed_seconds END) AS best_time_seconds,
           SUM(mistakes) AS total_mistakes,
           SUM(hints_used) AS total_hints_used
         FROM game_records WHERE user_id = ?`,
        [userId],
      )
      const [difficultyRows] = await pool.execute(
        `SELECT
           difficulty,
           COUNT(*) AS total_games,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_games,
           MIN(CASE WHEN status = 'completed' THEN elapsed_seconds END) AS best_time_seconds
         FROM game_records WHERE user_id = ?
         GROUP BY difficulty ORDER BY difficulty`,
        [userId],
      )
      return {
        totalGames: Number(summary.total_games),
        completedGames: Number(summary.completed_games ?? 0),
        bestTimeSeconds: summary.best_time_seconds === null ? null : Number(summary.best_time_seconds),
        totalMistakes: Number(summary.total_mistakes ?? 0),
        totalHintsUsed: Number(summary.total_hints_used ?? 0),
        byDifficulty: difficultyRows.map((row) => ({
          difficulty: row.difficulty,
          totalGames: Number(row.total_games),
          completedGames: Number(row.completed_games ?? 0),
          bestTimeSeconds: row.best_time_seconds === null ? null : Number(row.best_time_seconds),
        })),
      }
    },
  }

  return {
    driver: 'mysql',
    users,
    sessions,
    games,
    accounts: {
      async createUserWithSession(user, session) {
        const connection = await pool.getConnection()
        try {
          await connection.beginTransaction()
          await connection.execute(
            `INSERT INTO users (id, name, email, password_hash, password_salt, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [user.id, user.name, user.email, user.passwordHash, user.passwordSalt, user.createdAt, user.updatedAt],
          )
          await connection.execute(
            `INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
             VALUES (?, ?, ?, ?, ?)`,
            [session.id, session.userId, session.tokenHash, session.expiresAt, session.createdAt],
          )
          await connection.commit()
        } catch (error) {
          await connection.rollback()
          throw error
        } finally {
          connection.release()
        }
      },
    },
    async health() {
      await pool.query('SELECT 1')
      return true
    },
    async close() {
      await pool.end()
    },
  }
}
