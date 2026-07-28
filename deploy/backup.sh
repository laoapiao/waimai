#!/bin/bash
# ==========================================
# 阿飘菜市 — 每日自动备份
# 服务器上运行: bash deploy/backup.sh
# 加到 crontab: 0 3 * * * bash /home/admin/waimai/deploy/backup.sh
# ==========================================

BACKUP_DIR=/home/admin/backups/$(date +%Y%m%d)
mkdir -p $BACKUP_DIR

echo "📦 备份开始: $(date)"

# 1. 备份数据库
mysqldump -u waimai_user -pWaimai2024Abc waimai > $BACKUP_DIR/waimai.sql 2>/dev/null
echo "  ✅ 数据库 → $BACKUP_DIR/waimai.sql"

# 2. 备份上传文件
cp -r /home/admin/waimai/server/uploads $BACKUP_DIR/uploads 2>/dev/null
echo "  ✅ 上传文件 → $BACKUP_DIR/uploads"

# 3. 备份配置
cp /home/admin/waimai/server/.env $BACKUP_DIR/.env
echo "  ✅ 环境配置 → $BACKUP_DIR/.env"

# 4. 保留最近30天，自动删除旧备份
find /home/admin/backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null

SIZE=$(du -sh $BACKUP_DIR | cut -f1)
echo ""
echo "✅ 备份完成！大小: $SIZE"
