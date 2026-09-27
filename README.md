# 方寸数独

一个数独应用的三个部分：网页版、桌面版，以及两者共用的 API 服务。三个子项目各自独立安装依赖、独立构建、独立部署。

| 子项目 | 说明 | 技术栈 |
|---|---|---|
| [web-sudoku](./web-sudoku) | 网页版客户端 | React + Vite |
| [electron-sudoku](./electron-sudoku) | 桌面版客户端 | Electron + React + Vite |
| [sudoku-server](./sudoku-server) | 账户与游戏记录 API | Express + SQLite（可选 MySQL） |

## 三者如何组合

两个客户端**不依赖服务端也能完整运行**。数据层被抽象成统一接口，具体实现由构建时的环境变量 `VITE_DATA_SOURCE` 决定：

| 取值 | 账户与游戏记录存放位置 | 是否需要 sudoku-server |
|---|---|---|
| `local`（默认） | 当前设备的 IndexedDB | 否 |
| `server` | 通过 HTTP 存到 sudoku-server | 是 |

默认值**始终**是 `local`。没配环境变量、配错值、或只跑普通构建，都不会把数据发往服务器。

React 组件只依赖 `authService` 和 `gameRecordService` 两个接口，不关心背后是 IndexedDB 还是 HTTP。切换模式、处理已有本地账户、迁移历史记录的完整说明见 **[DATA_SOURCE_SWITCHING.md](./DATA_SOURCE_SWITCHING.md)**。

## 两个客户端是复制关系，不是共享包

`web-sudoku/src/` 与 `electron-sudoku/src/` 目前是**两份完全相同的副本**——15 个文件逐字节一致，包括游戏逻辑、认证、数据层和样式。仓库里没有共享的 npm 包或 workspace 配置把它们连起来。

**改动其中一份的 `src/`，必须手动同步到另一份**，否则两端行为会悄悄分叉。

两者真正的差异只有两个文件：

| 文件 | 差异原因 |
|---|---|
| `index.html` | 桌面版需要 Electron 的 CSP 声明 |
| `vite.config.js` | 桌面版构建产物走相对路径，并固定 dev server 端口 |

## 快速开始

需要 Node.js 20 或更高版本。

**网页版**（默认本地模式，不需要后端）：

```bash
cd web-sudoku
npm install
npm run dev
```

**桌面版**（会同时拉起 Vite 渲染层和 Electron 窗口）：

```bash
cd electron-sudoku
npm install
npm run dev
```

**API 服务**（只有切到 server 模式才需要）：

```bash
cd sudoku-server
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
npm run dev                 # http://127.0.0.1:3000
```

健康检查 `GET /api/health` 返回成功即就绪。

## 构建产物

| 命令 | 位置 | 产物 |
|---|---|---|
| `npm run build` | web-sudoku | `dist/`，静态站点 |
| `npm run build` | electron-sudoku | `dist/`，渲染层资源 |
| `npm run dist` | electron-sudoku | `release/`，Windows NSIS 安装包 |

`dist/`、`release/`、`node_modules/` 与 `.vite-cache/` 均不入库。

## clone 之后先做这一步

```bash
sh scripts/setup-git.sh
```

配置本仓库的提交身份，并启用禁止公司邮箱提交的 pre-commit 校验。**只写入仓库级 `.git/config`，不碰全局配置**，所以机器上其它仓库的身份不受影响。

为什么需要手动执行：`.git/config` 和 `.git/hooks/` 都不在版本控制范围内，clone 不会带过来，只能在每台机器上跑一次。

Windows 上如果用 PowerShell 而不是 Git Bash，`sh` 默认不在 PATH，用 Git 自带的：

```powershell
& "$env:ProgramFiles\Git\bin\sh.exe" scripts/setup-git.sh
```

想用别的身份就传参：

```bash
sh scripts/setup-git.sh "Your Name" "you@example.com"
```

### 提交身份约束

本仓库不接受公司邮箱（`*@ctechm.com`）的提交记录。约束由三个文件构成，全部纳入版本控制：

| 文件 | 作用 |
|---|---|
| `.githooks/blocked-email-patterns` | 禁用规则，每行一条扩展正则，不区分大小写 |
| `.githooks/pre-commit` | 提交前校验 author 与 committer，命中即拒绝 |
| `scripts/setup-git.sh` | 写入仓库级身份，并把 `core.hooksPath` 指向 `.githooks` |

钩子放 `.githooks/` 而不是 `.git/hooks/`，是因为后者不随仓库分发；改用 `core.hooksPath` 指过去，钩子本身就能版本控制、被 review、跟着 clone 走。校验读的是 `git var GIT_AUTHOR_IDENT` 而不是 `git config user.email`——前者是 git 最终实际使用的身份，连环境变量临时指定的情况也能拦住。

绕过方式（`--no-verify`、直接改 `.githooks/`）当然存在，这是一道防手滑的闸门，不是安全边界。服务端强制需要 GitHub 的 push ruleset 或 CI 检查。

## 文档索引

| 文档 | 内容 |
|---|---|
| [DATA_SOURCE_SWITCHING.md](./DATA_SOURCE_SWITCHING.md) | 本地与服务器模式切换、账户处理、记录迁移 |
| [web-sudoku/README.md](./web-sudoku/README.md) | 网页版功能清单与本地账户说明 |
| [electron-sudoku/README.md](./electron-sudoku/README.md) | 桌面版架构边界与打包 |
| [sudoku-server/README.md](./sudoku-server/README.md) | API 接口表、环境变量、上线注意事项 |
| [sudoku-server/MYSQL_SETUP.md](./sudoku-server/MYSQL_SETUP.md) | MySQL 初始化、配置、迁移与回滚 |

## 安全边界

- 本地模式下密码用 PBKDF2-SHA-256 加随机盐保存在 IndexedDB，服务器模式用 scrypt，两者都不保存明文
- 服务端会话是随机 Bearer Token，数据库只存令牌哈希
- 本地账户**不能**直接转成服务器账户：两端哈希算法不同，且不应新增上传密码哈希的接口，否则哈希会变成可复用凭据。正确做法是让用户在服务器重新注册或登录
- 迁移游戏记录必须由用户显式触发，不做启动时静默迁移，也不做服务器失败后自动回退本地——那会产生两份不同步的数据
