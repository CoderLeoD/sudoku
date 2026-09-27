# 方寸数独 · Electron

这是与 `web-sudoku` 并列、彼此独立的桌面项目。当前已完成 Electron + React + Vite 基础架构、数独游戏，以及本地登录注册。

## 开发运行

```bash
npm install
npm run dev
```

`npm run dev` 会同时启动 Vite 渲染层和 Electron 桌面窗口。

## 构建与启动

```bash
npm run build
npm start
```

生成 Windows 安装包：

```bash
npm run dist
```

构建产物分别位于 `dist/`（渲染层）与 `release/`（桌面安装包）。

## 登录注册

- 游客无需登录即可继续玩。
- 默认将账户和用户游戏记录存入当前设备的 IndexedDB；已经预留可选 `sudoku-server` API 适配器。
- 密码使用 PBKDF2-SHA-256 加随机盐后保存，不保存明文密码。
- 认证逻辑位于独立服务层，后续可替换为后端 API。

本地账户仅适合当前开发阶段。清除应用数据会删除账户；正式接入后端后应由服务端负责认证、会话与安全策略。

从 IndexedDB 切换到服务器接口、处理本地账户及迁移游戏记录的完整说明见 [DATA_SOURCE_SWITCHING.md](../DATA_SOURCE_SWITCHING.md)。

## 架构边界

- `electron/main.js`：Electron 生命周期、窗口和安全策略。
- `electron/preload.cjs`：受控的桌面能力桥接层。
- `src/auth/`：认证上下文、界面和本地认证服务。
- `src/data/`：IndexedDB 数据库、用户表及游戏记录表。
- `src/`：React 数独界面与纯前端游戏逻辑。
- `dist/`：Vite 生成的渲染层资源。

渲染层保持浏览器兼容，不直接访问 Node.js。

## 分阶段计划

1. **已完成**：Electron 项目与数独游戏。
2. **已完成**：游客可玩；登录、注册使用 IndexedDB 本地数据库。
3. **下一阶段**：按本地用户记录游戏数据。
4. **未来阶段**：服务层切换为后端接口与数据库。
