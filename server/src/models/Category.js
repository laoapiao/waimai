/**
 * 商品分类模型
 *
 * 例如：主食、饮料、小吃、甜品
 */
module.exports = (sequelize, DataTypes) => {
  const Category = sequelize.define('Category', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '分类名称',
    },
    sort_order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: '排序（数字越小越靠前）',
    },
    icon: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: '分类图标',
    },
  }, {
    tableName: 'categories',
    timestamps: true,
    underscored: true,
  });

  return Category;
};
