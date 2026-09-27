# 方寸数独 · Node.js 后端

这是 `web-sudoku` 与 `electron-sudoku` 共用的独立 API 项目。当前默认使用 Express + SQLite，同时已经预留可选 MySQL 适配器；切换数据库不会改变 HTTP API。

## 当前能力

- 注册、登录、查询当前用户和退出登录
- scrypt 密码加盐哈希，不保存明文密码
- 随机 Bearer Token 会话；数据库只保存令牌哈希
- 用户游戏记录的新增、更新、分页查询和统计
- SQLite WAL、本地持久化、外键和索引
- 可选 MySQL 连接池、事务和同构仓储实现（默认不启用）
- CORS 白名单、Helmet 安全响应头、认证接口限流
- 统一 JSON 错误格式和自动化 API 测试

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

默认地址为 `http://127.0.0.1:3000`，健康检查：

```text
GET /api/health
```

生产启动：

```bash
npm start
```

运行测试：

```bash
npm test
```

## API

| 方法 | 路径 | 鉴权 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/health` | 否 | 健康检查 |
| POST | `/api/auth/register` | 否 | 注册并创建会话 |
| POST | `/api/auth/login` | 否 | 登录并创建会话 |
| GET | `/api/auth/me` | Bearer | 当前账户 |
| POST | `/api/auth/logout` | Bearer | 注销当前会话 |
| GET | `/api/games` | Bearer | 分页读取游戏记录 |
| POST | `/api/games` | Bearer | 新建游戏记录 |
| PUT | `/api/games/:id` | Bearer | 更新自己的游戏记录 |
| GET | `/api/games/stats` | Bearer | 用户游戏统计 |

鉴权请求使用：

```http
Authorization: Bearer <token>
```

成功响应使用 `{ "data": ... }`，错误响应使用：

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "邮箱或密码不正确"
  }
}
```

## 环境变量

- `HOST`、`PORT`：监听地址与端口。
- `DATABASE_DRIVER`：默认 `sqlite`；未来可以改为 `mysql`。
- `DATABASE_PATH`：SQLite 文件位置。
- `MYSQL_*`：MySQL 连接池与 TLS 预留配置，仅在 MySQL 模式读取。
- `SESSION_TTL_DAYS`：登录会话有效天数。
- `CORS_ORIGINS`：允许的网页来源，多个来源用逗号分隔。
- `TRUST_PROXY`：部署到 Nginx、负载均衡器等可信反向代理之后设为 `true`。

## 上线注意事项

1. 使用 HTTPS，并通过 Nginx/Caddy 将 `/api` 反向代理到本服务。
2. 将 `CORS_ORIGINS` 改为正式网站域名，不要使用任意来源。
3. 将 `data/` 放在持久化磁盘并定期备份；不要通过 Web 服务器暴露数据库文件。
4. 使用 systemd、PM2 或容器保持服务运行，日志交给服务器日志系统管理。
5. 多实例或数据量增大时，将仓储层切换到 PostgreSQL/MySQL；SQLite 更适合当前单机阶段。

完整 MySQL 初始化、配置、迁移与回滚说明见 [MYSQL_SETUP.md](./MYSQL_SETUP.md)。
