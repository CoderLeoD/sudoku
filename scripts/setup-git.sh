#!/bin/sh
# 配置本仓库的 git 提交身份, 并启用禁用公司邮箱的 pre-commit 校验。
#
# clone 之后执行一次:
#     sh scripts/setup-git.sh
#
# 使用自定义身份:
#     sh scripts/setup-git.sh "Your Name" "you@example.com"
#
# 只写入仓库级的 .git/config, 不会改动机器上的全局 git 配置,
# 因此公司 gitlab 等其它仓库的身份不受影响。

DEFAULT_NAME="CoderLeoD"
DEFAULT_EMAIL="19791438+CoderLeoD@users.noreply.github.com"

root=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -z "$root" ]; then
  echo "错误: 当前目录不是 git 仓库。请在 clone 下来的项目目录里执行。" >&2
  exit 1
fi
cd "$root" || exit 1

name=${1:-$DEFAULT_NAME}
email=${2:-$DEFAULT_EMAIL}
patterns=".githooks/blocked-email-patterns"

# 先用同一套规则校验将要写入的邮箱, 避免把违规身份配进去
if [ -f "$patterns" ]; then
  while IFS= read -r pattern; do
    case "$pattern" in
      '' | \#*) continue ;;
    esac
    if printf '%s\n' "$email" | grep -qiE -- "$pattern"; then
      echo "错误: 邮箱 <$email> 命中禁用规则 /$pattern/, 未做任何修改。" >&2
      echo "请换一个邮箱, 或修改 $patterns" >&2
      exit 1
    fi
  done < "$patterns"
fi

git config user.name "$name"
git config user.email "$email"

# 钩子在 .git/hooks 下不随仓库分发, 因此改用版本控制目录 .githooks
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit 2>/dev/null

echo "已完成本仓库配置 (仅 .git/config, 全局配置未改动):"
echo "  user.name       = $(git config user.name)"
echo "  user.email      = $(git config user.email)"
echo "  core.hooksPath  = $(git config core.hooksPath)"
echo ""

# 顺带体检一下已有历史
if git rev-parse HEAD >/dev/null 2>&1 && [ -f "$patterns" ]; then
  dirty=0
  while IFS= read -r pattern; do
    case "$pattern" in
      '' | \#*) continue ;;
    esac
    if git log --all --format='%ae%n%ce' | grep -qiE -- "$pattern"; then
      echo "警告: 现有提交历史中存在命中 /$pattern/ 的邮箱。" >&2
      dirty=1
    fi
  done < "$patterns"
  if [ "$dirty" -eq 0 ]; then
    echo "历史提交检查: 未发现禁用邮箱。"
  else
    echo "清理历史需要重写提交 (git filter-repo 等), 且要强推, 请先与协作者确认。" >&2
  fi
fi
