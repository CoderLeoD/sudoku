# MySQL 后期接入指南

当前项目默认并继续使用 SQLite。MySQL 适配器已经实现，但只有将 `DATABASE_DRIVER` 明确设置为 `mysql` 时才会加载，因此现在不需要安装或运行 MySQL。

## 已预留的代码

- `src/database/createStorage.js`：数据库驱动选择入口。
- `src/database/createSqliteStorage.js`：当前默认 SQLite 适配器。
- `src/database/mysql/createMysqlStorage.js`：MySQL 连接池、事务和全部仓储实现。
- `src/database/mysql/schema.sql`：MySQL 8.0+ 表结构。
- `.env.example`：MySQL 连接、连接池和 TLS 配置模板。

两种适配器向业务层提供相同的 `users`、`sessions`、`games` 和 `accounts` 接口。认证路由与游戏记录路由不会直接依赖某一种数据库。

## 一、准备 MySQL

推荐 MySQL 8.0 或更高版本。在数据库服务器上使用管理员账户执行：

```sql
CREATE DATABASE sudoku
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

CREATE USER 'sudoku_app'@'%' IDENTIFIED BY '请替换为高强度随机密码';
GRANT SELECT, INSERT, UPDATE, DELETE ON sudoku.* TO 'sudoku_app'@'%';
FLUSH PRIVILEGES;
```

如果 Node.js 与 MySQL 在同一台服务器，建议把账户来源从 `%` 收紧为 `localhost`。云数据库则应使用安全组或防火墙，只允许应用服务器访问 3306 端口。

## 二、初始化表结构

使用管理员账户在 `sudoku` 数据库中执行：

```text
src/database/mysql/schema.sql
```

可以通过 MySQL Workbench 打开并执行该文件，也可以在支持输入重定向的终端中运行：

```bash
mysql -u root -p sudoku < src/database/mysql/schema.sql
```

应用账户只需要日常增删改查权限，不需要长期持有建表权限。服务启动时会检查 `users`、`sessions` 和 `game_records`，缺表会立即报出清晰错误。

## 三、配置服务

复制 `.env.example` 为 `.env`，修改以下内容：

```dotenv
DATABASE_DRIVER=mysql

MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=sudoku_app
MYSQL_PASSWORD=请替换为真实密码
MYSQL_DATABASE=sudoku
MYSQL_CONNECTION_LIMIT=10
MYSQL_SSL=false
MYSQL_SSL_CA_PATH=
```

说明：

- `DATABASE_PATH` 在 MySQL 模式下会被忽略。
- 正式环境不要提交 `.env`；密码应由服务器密钥或环境变量系统管理。
- 使用云数据库时建议启用 `MYSQL_SSL=true`。
- 私有 CA 可通过 `MYSQL_SSL_CA_PATH=./secrets/mysql-ca.pem` 提供；证书不要提交到仓库。

## 四、启动与检查

```bash
npm install
npm start
```

访问：

```text
GET /api/health
```

成功响应的 `data.database` 应为 `mysql`。如果连接失败，请依次检查主机、端口、账户来源限制、密码、防火墙、TLS 和表结构。

## 五、现有 SQLite 数据迁移

切换驱动只会改变后续读写位置，不会自动搬运 `data/sudoku.sqlite` 中的既有数据。正式切换前应单独执行一次迁移：

1. 暂停写入或短暂停服，备份 SQLite 文件。
2. 按依赖顺序迁移 `users`、`sessions`、`game_records`。
3. 保留原 UUID、密码哈希、盐值和 ISO 时间字符串，不需要让用户重设密码。
4. 对比每张表的记录数量，并抽查登录和游戏统计。
5. 再将 `DATABASE_DRIVER` 改为 `mysql` 并启动服务。
6. SQLite 备份保留一段观察期，以便快速回滚。

迁移脚本应在确定最终 MySQL 地址和数据规模后编写，避免在当前阶段引入会误操作正式数据的命令。

## 六、上线建议

- MySQL 不应直接暴露给公网，只允许 API 服务器访问。
- 定期备份并测试恢复流程。
- 监控连接池、慢查询、磁盘容量和错误率。
- 多个 API 实例可以共用 MySQL；这正是从单机 SQLite 切换的主要时机。
- 切换完成后再次运行 `npm test`，并在隔离环境执行注册、登录、游戏记录和统计的集成测试。
