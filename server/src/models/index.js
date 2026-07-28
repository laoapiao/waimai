/**
 * 模型关联入口
 *
 * 这里定义各个表之间的关系，Sequelize 会自动：
 * 1. 创建外键
 * 2. 提供便捷的关联查询方法（如 user.getOrders()）
 */

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// 导入所有模型定义
const User = require('./User')(sequelize, DataTypes);
const Category = require('./Category')(sequelize, DataTypes);
const Product = require('./Product')(sequelize, DataTypes);
const Order = require('./Order')(sequelize, DataTypes);
const OrderItem = require('./OrderItem')(sequelize, DataTypes);
const Review = require('./Review')(sequelize, DataTypes);

// ========== 定义关联关系 ==========

// 分类 → 商品：一个分类下有多个商品
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// 用户（顾客）→ 订单：一个顾客可以下多个订单
User.hasMany(Order, { foreignKey: 'customer_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'customer_id', as: 'customer' });

// 用户（骑手）→ 订单：一个骑手可以接多个订单
User.hasMany(Order, { foreignKey: 'rider_id', as: 'deliveries' });
Order.belongsTo(User, { foreignKey: 'rider_id', as: 'rider' });

// 订单 → 订单明细：一个订单包含多个商品
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 商品 → 订单明细
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'order_items' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// 订单 → 评价：一个订单对应一条评价（一对一）
Order.hasOne(Review, { foreignKey: 'order_id', as: 'review' });
Review.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// 用户 → 评价：一个用户可以写多条评价
User.hasMany(Review, { foreignKey: 'user_id', as: 'reviews' });
Review.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Order,
  OrderItem,
  Review,
};
