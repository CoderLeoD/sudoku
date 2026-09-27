# 方寸 · 数独

一个使用 React + Vite 构建的网页数独应用，与 `electron-sudoku` 并列、彼此独立。

## 本地运行

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 已实现

- 轻松、进阶、挑战三档唯一解题目
- 自动保存当前进度
- 候选数、提示、擦除、撤销与重做
- 冲突与错误提示、完成判定
- 键盘和触屏操作
- 响应式桌面/移动端布局
- 游客直接游玩，以及本地注册、登录和退出

## 本地账户说明

默认情况下，账户和用户游戏记录存入当前浏览器的 IndexedDB，密码使用 PBKDF2-SHA-256 加随机盐后保存，不保存明文密码。已经预留 `sudoku-server` API 适配器，但不会默认启用。

从 IndexedDB 切换到服务器接口、处理本地账户及迁移游戏记录的完整说明见 [DATA_SOURCE_SWITCHING.md](../DATA_SOURCE_SWITCHING.md)。
