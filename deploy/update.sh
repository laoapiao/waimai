#!/bin/bash
# ==========================================
# 阿飘菜市 — 安全更新脚本
# 服务器上运行: bash deploy/update.sh
# 保证：不覆盖 .env、不删除上传文件、不丢数据库数据
# ==========================================

set -e
echo "🔒 阿飘菜市 - 安全更新"
echo "  绝不覆盖: .env / uploads / 数据库数据"
echo ""

cd /home/admin/waimai

# 1. 备份当前.env（防止被覆盖）
cp server/.env server/.env.backup.$(date +%Y%m%d%H%M)

# 2. 拉取最新代码
git pull

# 3. 恢复.env（git pull 不会覆盖.gitignore里的文件，二次保险）
cp server/.env.backup.* server/.env 2>/dev/null || true

# 4. 安装新依赖
cd server && npm install --production

# 5. 数据库安全同步（force:false, alter:false = 只创建新表，不改旧表）
node -e "
const { sequelize } = require('./src/models');
sequelize.sync({ force: false, alter: false }).then(() => {
  console.log('✅ 数据库同步完成（无数据丢失）');
  process.exit();
});
"

# 6. 重启服务
pm2 restart waimai-api
pm2 save

echo ""
echo "✅ 更新完成！数据安全。"
echo "   备份 .env → server/.env.backup.*"
