/**
 * 评价模型
 *
 * 顾客完成订单后可以对订单进行评价
 */
module.exports = (sequelize, DataTypes) => {
  const Review = sequelize.define('Review', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
      comment: '评分（1-5星）',
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '评价内容',
    },
    // order_id:  外键，评价哪个订单
    // user_id:   外键，谁评价的
  }, {
    tableName: 'reviews',
    timestamps: true,
    underscored: true,
  });

  return Review;
};
