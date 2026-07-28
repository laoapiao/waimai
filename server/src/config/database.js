/**
 * 数据库配置 - 连接 MySQL
 *
 * Sequelize 是一个 ORM（对象关系映射）库
 * 它让我们用 JavaScript 对象来操作数据库，不用手写 SQL
 * 同时自动防止 SQL 注入攻击
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// 创建数据库连接
const sequelize = new Sequelize(
  process.env.DB_NAME || 'waimai',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',

    // 连接池配置（控制同时有多少个数据库连接）
    pool: {
      max: 10,       // 最多 10 个连接
      min: 0,         // 最少 0 个
      acquire: 30000, // 等待连接的最长时间（30秒）
      idle: 10000,    // 连接空闲 10 秒后释放
    },

    // 日志控制
    logging: process.env.NODE_ENV === 'development'
      ? (msg) => console.log('📝 SQL:', msg)
      : false,

    // 时区设置
    timezone: '+08:00',
  }
);

/**
 * 测试数据库连接
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ 数据库连接成功！');
  } catch (error) {
    console.error('❌ 数据库连接失败：', error.message);
    console.log('\n请确认：');
    console.log('1. MySQL 服务已启动');
    console.log('2. 数据库 waimai 已创建');
    console.log('3. .env 文件中的数据库配置正确');
    process.exit(1);
  }
}

module.exports = { sequelize, testConnection };
