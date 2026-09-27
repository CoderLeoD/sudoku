-- 方寸数独 MySQL 8.0+ 初始化结构。
-- 先创建数据库和低权限应用账户，再在目标数据库中执行本文件。

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(24) NOT NULL,
  email VARCHAR(254) COLLATE utf8mb4_0900_ai_ci NOT NULL UNIQUE,
  password_hash VARCHAR(128) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  created_at VARCHAR(35) NOT NULL,
  updated_at VARCHAR(35) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  expires_at VARCHAR(35) NOT NULL,
  created_at VARCHAR(35) NOT NULL,
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_token_hash (token_hash),
  INDEX idx_sessions_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS game_records (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  puzzle_id VARCHAR(100),
  difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
  status ENUM('in_progress', 'completed', 'abandoned') NOT NULL,
  elapsed_seconds INT UNSIGNED NOT NULL DEFAULT 0,
  mistakes INT UNSIGNED NOT NULL DEFAULT 0,
  hints_used INT UNSIGNED NOT NULL DEFAULT 0,
  state_json LONGTEXT,
  started_at VARCHAR(35) NOT NULL,
  completed_at VARCHAR(35),
  created_at VARCHAR(35) NOT NULL,
  updated_at VARCHAR(35) NOT NULL,
  CONSTRAINT fk_game_records_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_game_records_user_created (user_id, created_at DESC),
  INDEX idx_game_records_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
