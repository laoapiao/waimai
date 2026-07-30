/**
 * 用户模型
 *
 * 字段说明：
 * - id:            用户唯一编号（自动生成）
 * - phone:         手机号（用于登录）
 * - password:      加密后的密码（bcrypt 加密，不是明文存储）
 * - nickname:      昵称
 * - avatar:        头像图片地址
 * - role:          角色：customer(顾客) | merchant(商家) | rider(骑手)
 * - wx_openid:     微信OpenID（顾客用微信登录时绑定）
 * - status:        账号状态：active(正常) | disabled(禁用)
 */
module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    phone: {
      type: DataTypes.STRING(11),
      unique: true,
      allowNull: true,       // 微信登录的顾客可以没有手机号
      comment: '手机号',
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,       // 微信登录的顾客不需要密码
      comment: '加密密码',
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '新用户',
      comment: '昵称',
    },
    avatar: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '头像URL',
    },
    role: {
      type: DataTypes.ENUM('customer', 'merchant', 'rider'),
      allowNull: false,
      comment: '用户角色',
    },
    wx_openid: {
      type: DataTypes.STRING(100),
      unique: true,
      allowNull: true,
      comment: '微信OpenID',
    },
    status: {
      type: DataTypes.ENUM('active', 'disabled'),
      defaultValue: 'active',
      comment: '账号状态',
    },
    is_online: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: '骑手在线状态',
    },
    deposit: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      comment: '保证金（元）',
    },
    max_orders: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      comment: '最大同时接单数',
    },
    payment_account: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '收款账户JSON（银行卡/微信/支付宝）',
    },
  }, {
    tableName: 'users',
    timestamps: true,       // 自动记录 createdAt 和 updatedAt
    underscored: true,      // 字段名用蛇形命名（create_at 而不是 createdAt）
  });

  return User;
};
