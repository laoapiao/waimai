#!/bin/bash
# ==========================================
# 阿飘菜市 - 性能优化脚本
# ==========================================
echo "🔧 开始优化..."

# 1. MySQL 加缺失索引
mysql -u waimai_user -pWaimai2024Abc waimai << 'SQL'
CREATE INDEX IF NOT EXISTS idx_product_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_product_available ON products(is_available);
CREATE INDEX IF NOT EXISTS idx_order_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_rider ON orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_review_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_review_order ON reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user ON feedbacks(user_id);
SHOW INDEX FROM products;
SQL
echo "✅ MySQL索引已添加"

# 2. Node.js 加 Gzip 压缩
cd /home/admin/waimai/server
npm install compression 2>/dev/null
echo "✅ 依赖已安装"

# 3. PM2 切换 cluster 模式（利用多核）
pm2 delete waimai-api 2>/dev/null
pm2 start src/app.js --name waimai-api -i max --max-memory-restart 500M
pm2 save

echo ""
echo "✅ 优化完成！"
echo "   MySQL: 索引已添加"
echo "   PM2: cluster 模式（多核）"
echo "   Node: 已装 compression"
