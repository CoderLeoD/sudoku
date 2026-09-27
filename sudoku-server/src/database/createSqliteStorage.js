import { createDatabase } from './createDatabase.js'
import { createGameRepository } from '../repositories/gameRepository.js'
import { createSessionRepository } from '../repositories/sessionRepository.js'
import { createUserRepository } from '../repositories/userRepository.js'

/**
 * SQLite 是当前默认存储实现。它与 MySQL 适配器暴露相同的接口，
 * 因此业务服务不需要知道数据最终落在哪一种数据库中。
 */
export function createSqliteStorage(filename) {
  const database = createDatabase(filename)
  const users = createUserRepository(database)
  const sessions = createSessionRepository(database)
  const games = createGameRepository(database)
  const createUserWithSessionTransaction = database.transaction((user, session) => {
    users.create(user)
    sessions.create(session)
  })

  return {
    driver: 'sqlite',
    users,
    sessions,
    games,
    accounts: {
      createUserWithSession(user, session) {
        createUserWithSessionTransaction(user, session)
      },
    },
    async health() {
      database.prepare('SELECT 1 AS healthy').get()
      return true
    },
    async close() {
      database.close()
    },
  }
}
