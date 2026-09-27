import { serverAuthService } from '../auth/serverAuthService.js'
import { localDatabase } from './localDatabase.js'
import { serverGameRecordService } from './serverGameRecordService.js'

/**
 * 显式迁移工具，不会在应用启动时自动运行。
 * 调用前必须先登录服务器账户，并让用户确认上传本机游戏记录。
 * 本地账户密码哈希不会上传；服务器账户必须单独注册或登录。
 */
export async function migrateLocalGameRecordsToServer(localUserId, { onProgress } = {}) {
  const serverUser = await serverAuthService.getCurrentUser()
  if (!serverUser) throw new Error('请先登录服务器账户，再迁移本地游戏记录')

  const records = await localDatabase.gameRecords.getByUser(localUserId)
  const pending = records.filter((record) => !record.serverSync?.recordId)
  const result = { total: pending.length, migrated: 0, failed: [] }

  for (const record of pending) {
    try {
      const serverRecord = await serverGameRecordService.create(serverUser.id, {
        puzzleId: record.puzzleId,
        difficulty: record.difficulty,
        status: record.status,
        elapsedSeconds: record.elapsedSeconds,
        mistakes: record.mistakes,
        hintsUsed: record.hintsUsed,
        state: record.state,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
      })
      await localDatabase.gameRecords.put({
        ...record,
        serverSync: { recordId: serverRecord.id, migratedAt: new Date().toISOString() },
      })
      result.migrated += 1
    } catch (error) {
      result.failed.push({ localRecordId: record.id, message: error?.message || '迁移失败' })
    }
    onProgress?.({ ...result })
  }

  return result
}
