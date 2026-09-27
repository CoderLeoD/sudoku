import { ApiError } from '../lib/ApiError.js'
import { createSqliteStorage } from './createSqliteStorage.js'

/**
 * 数据库驱动的唯一选择入口。
 * 默认分支继续使用 SQLite；MySQL 模块通过动态导入加载，确保未启用时
 * 不会尝试连接 MySQL，也不会影响现有本地开发方式。
 */
export async function createStorage(configuration) {
  if (configuration.databaseDriver === 'sqlite') {
    return createSqliteStorage(configuration.databasePath)
  }

  if (configuration.databaseDriver === 'mysql') {
    const { createMysqlStorage } = await import('./mysql/createMysqlStorage.js')
    return createMysqlStorage(configuration.mysql)
  }

  throw new ApiError(
    500,
    'UNSUPPORTED_DATABASE_DRIVER',
    `不支持的数据库驱动：${configuration.databaseDriver}`,
  )
}
