/**
 * 商品模型
 *
 * 商家上架的每一个商品
 */
module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define('Product', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '商品名称',
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),   // 总共10位，小数点后2位
      allowNull: false,
      comment: '价格（元）',
    },
    image: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '商品图片',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '商品描述',
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: '是否上架（true=上架，false=下架）',
    },
    sales_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '销量',
    },
    // category_id 是通过关联自动添加的外键
  }, {
    tableName: 'products',
    timestamps: true,
    underscored: true,
  });

  return Product;
};
