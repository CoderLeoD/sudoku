import { createApp } from './app.js'
import { config } from './config.js'
import { createStorage } from './database/createStorage.js'

const storage = await createStorage(config)
const app = createApp({
  storage,
  corsOrigins: config.corsOrigins,
  sessionTtlDays: config.sessionTtlDays,
  trustProxy: config.trustProxy,
})

const server = app.listen(config.port, config.host, () => {
  console.log(`Sudoku API listening on http://${config.host}:${config.port} (${storage.driver})`)
})

function shutdown(signal) {
  console.log(`${signal} received, shutting down...`)
  server.close(async () => {
    await storage.close()
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
