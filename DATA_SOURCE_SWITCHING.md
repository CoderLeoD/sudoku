# 前端从 IndexedDB 切换到 sudoku-server

`web-sudoku` 与 `electron-sudoku` 现在使用同一套数据服务接口，并提供两个实现：

- `local`：默认模式。账户和已登录用户的游戏记录保存在当前设备的 IndexedDB。
- `server`：预留模式。账户、会话和游戏记录通过 HTTP 请求保存到 `sudoku-server`。

当前默认值始终是 `local`。没有配置环境变量、配置值拼错或只执行普通构建时，都不会把数据发送到服务器。

## 代码位置

- `src/data/dataServices.js`：唯一数据源选择入口。
- `src/auth/localAuthService.js`：IndexedDB 本地认证。
- `src/auth/serverAuthService.js`：`sudoku-server` 认证请求。
- `src/data/localGameRecordService.js`：IndexedDB 游戏记录。
- `src/data/serverGameRecordService.js`：`/api/games` 请求。
- `src/services/apiClient.js`：统一 HTTP 客户端。
- `src/data/migrateLocalDataToServer.js`：显式游戏记录迁移工具，不会自动执行。

React 组件只依赖 `authService` 和 `gameRecordService`，不直接判断具体数据库。

## 当前本地持久化边界

- 本地账户：IndexedDB 的 `users` 表。
- 已登录用户完成的游戏：IndexedDB 的 `gameRecords` 表。
- 登录状态：轻量的 `localStorage` 会话标识。
- 当前棋局快照：继续保存在 `localStorage`，确保游客和离线用户刷新后仍能继续。

服务器模式只替换账户与用户游戏记录。游客当前棋局仍保留在本机，不会在未登录时上传。

## 一、保持当前 IndexedDB 模式

`.env` 不存在时默认就是本地模式，也可以明确配置：

```dotenv
VITE_DATA_SOURCE=local
```

`VITE_API_BASE_URL` 在本地模式下不会被调用。两份应用都可以照常执行 `npm run build`。

## 二、准备 sudoku-server

1. 部署并启动 `sudoku-server`。
2. 确认 `GET /api/health` 返回成功。
3. 正式网站跨域访问 API 时，将网站来源加入服务端 `CORS_ORIGINS`。
4. 推荐让 Web 服务器把同域 `/api` 反向代理到 Node.js 服务，这样网页版无需跨域。
5. 正式环境必须使用 HTTPS。

## 三、切换 web-sudoku

创建 `web-sudoku/.env.production`：

```dotenv
VITE_DATA_SOURCE=server
VITE_API_BASE_URL=/api
```

然后重新构建：

```bash
npm run build
```

如果 API 使用独立域名，则填写完整地址：

```dotenv
VITE_API_BASE_URL=https://api.example.com/api
```

Vite 环境变量在构建时写入产物；修改后必须重新构建并重新部署 `dist/`。

## 四、切换 electron-sudoku

创建 `electron-sudoku/.env.production`：

```dotenv
VITE_DATA_SOURCE=server
VITE_API_BASE_URL=https://api.example.com/api
```

Electron 正式包不能使用网页服务器的相对 `/api`，应填写可访问的完整 HTTPS 地址，然后重新执行打包。Electron 的 CSP 已预留 HTTPS API 连接能力。

## 五、本地账户如何处理

本地账户不能直接转换为服务器账户：

- IndexedDB 保存的是 PBKDF2 客户端密码哈希。
- `sudoku-server` 使用 scrypt，并且注册接口只接受用户主动输入的原始密码。
- 不应新增“上传本地密码哈希”的接口，否则会把哈希变成可复用凭据并削弱安全边界。

正确流程是：切换服务器模式后，让用户在服务器重新注册或登录。可以沿用相同邮箱，但必须由用户再次输入密码。

本地与服务器会话使用不同的存储键，因此切换不会删除原 IndexedDB 账户，必要时仍可回退。

## 六、迁移本地游戏记录

迁移不得在应用启动时静默发生。推荐在账户页提供“迁移本机记录”按钮，向用户说明上传内容并取得明确确认，然后调用：

```js
import { localAuthService } from './auth/localAuthService.js'
import { migrateLocalGameRecordsToServer } from './data/migrateLocalDataToServer.js'

const localUser = await localAuthService.getCurrentUser()
if (!localUser) throw new Error('没有找到本地账户')

const result = await migrateLocalGameRecordsToServer(localUser.id, {
  onProgress(progress) {
    console.log(progress)
  },
})
```

调用前，用户必须已经通过服务器模式注册或登录。迁移工具会：

1. 读取指定本地用户的 IndexedDB 游戏记录。
2. 跳过已经带有 `serverSync.recordId` 的记录。
3. 逐条调用 `POST /api/games`。
4. 成功后在本地记录写入服务器记录 ID 和迁移时间。
5. 返回成功数与失败列表，方便界面展示和重试。

当前棋局快照和本地账户密码不会上传。迁移完成后建议核对服务器统计，但暂时保留 IndexedDB 数据作为回滚备份。

## 七、切换原则

- 不做静默自动迁移。
- 不做服务器失败后自动回退 IndexedDB；这会形成两份不同步的数据。
- 不同时双写两种数据源，除非以后设计了可靠的同步队列和幂等键。
- 切换前备份、切换后核对、观察稳定后再考虑清理本地副本。
- 回退时将 `VITE_DATA_SOURCE` 改回 `local` 并重新构建，原 IndexedDB 数据仍然存在。
