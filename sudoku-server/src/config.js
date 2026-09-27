import 'dotenv/config'
import path from 'node:path'

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function parseBoolean(value, fallback = false) {
  if (value === undefined) return fallback
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export const config = Object.freeze({
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: parsePositiveInteger(process.env.PORT, 3000),
  // 保持 sqlite 为默认值。未来切换 MySQL 只需要修改环境变量，无需改路由代码。
  databaseDriver: (process.env.DATABASE_DRIVER ?? 'sqlite').toLowerCase(),
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH ?? './data/sudoku.sqlite'),
  mysql: Object.freeze({
    host: process.env.MYSQL_HOST ?? '127.0.0.1',
    port: parsePositiveInteger(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER ?? 'sudoku_app',
    password: process.env.MYSQL_PASSWORD ?? '',
    database: process.env.MYSQL_DATABASE ?? 'sudoku',
    connectionLimit: parsePositiveInteger(process.env.MYSQL_CONNECTION_LIMIT, 10),
    ssl: parseBoolean(process.env.MYSQL_SSL),
    sslCaPath: process.env.MYSQL_SSL_CA_PATH
      ? path.resolve(process.cwd(), process.env.MYSQL_SSL_CA_PATH)
      : null,
  }),
  sessionTtlDays: parsePositiveInteger(process.env.SESSION_TTL_DAYS, 30),
  corsOrigins,
  trustProxy: parseBoolean(process.env.TRUST_PROXY),
})
