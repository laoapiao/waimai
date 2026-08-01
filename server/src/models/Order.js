/**
 * 订单模型
 *
 * 订单状态流转：
 * pending（待接单）→ accepted（已接单）→ arrived（已到店）
 * → delivering（配送中）→ completed（已完成）
 *
 * 可能被取消：pending/accepted 状态下都可以取消
 */
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_no: {
      type: DataTypes.STRING(32),
      unique: true,
      allowNull: false,
      comment: '订单编号（显示给用户看的）',
    },
    idempotency_key: {
      type: DataTypes.STRING(64),
      unique: true,
      allowNull: true,
      comment: '幂等键，防重复提交',
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'arrived', 'delivering', 'completed', 'cancelled'),
      defaultValue: 'pending',
      comment: '订单状态',
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '订单总金额',
    },
    delivery_address: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: '配送地址',
    },
    contact_phone: {
      type: DataTypes.STRING(11),
      allowNull: false,
      comment: '联系电话',
    },
    remark: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '备注（如：不要辣、多放醋）',
    },
    lat: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: '顾客位置纬度',
    },
    lng: {
      type: DataTypes.DECIMAL(10, 7),
      allowNull: true,
      comment: '顾客位置经度',
    },
    delivery_fee: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 5.00,
      comment: '配送费（骑手收入）',
    },
    store_address: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '取餐地址（商户位置）',
    },
    store_lat: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    store_lng: { type: DataTypes.DECIMAL(10, 7), allowNull: true },
    // 以下外键通过关联自动创建：
    // customer_id:  下单顾客ID
    // rider_id:     接单骑手ID
  }, {
    tableName: 'orders',
    timestamps: true,
    underscored: true,
  });

  return Order;
};
