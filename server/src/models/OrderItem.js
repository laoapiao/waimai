/**
 * 订单明细模型
 *
 * 一个订单可能包含多个商品，这个表记录每个订单里的每个商品
 * 例如：订单#123 包含：
 *   - 黄焖鸡米饭 x2  ￥25/份
 *   - 可乐 x1        ￥5/瓶
 */
module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: '数量',
    },
    unit_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '下单时的单价（防止商品改价后历史订单价格变化）',
    },
    // order_id:   外键，属于哪个订单
    // product_id: 外键，哪个商品
  }, {
    tableName: 'order_items',
    timestamps: true,
    underscored: true,
  });

  return OrderItem;
};
