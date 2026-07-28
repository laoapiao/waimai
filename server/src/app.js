/**
 * 外卖系统 — 后端服务入口
 *
 * 这是整个后端的核心文件，负责：
 * 1. 启动 Express 服务器
 * 2. 挂载所有中间件（安全防护）
 * 3. 挂载所有路由（API接口）
 * 4. 连接数据库并启动服务
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { testConnection, sequelize } = require('./config/database');
const { errorHandler, notFound } = require('./utils/errors');

// 导入路由
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const settingsRoutes = require('./routes/settings');
const feedbackRoutes = require('./routes/feedback');
const payRoutes = require('./routes/pay');

// 创建 Express 应用
const app = express();

// ========== 1. 基础中间件（安全相关） ==========

// Helmet：设置各种 HTTP 安全头（防 XSS、防点击劫持等）
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  } : false,
}));

// CORS：允许前端跨域访问（开发阶段用 *，生产要限制具体域名）
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN || 'https://yourdomain.com').split(',')
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }));

// ========== 2. 频率限制 ==========

// 全局限制：每个IP每分钟最多100次请求
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1分钟窗口
  max: 100,             // 最多100次
  message: {
    code: 429,
    message: '请求太频繁了，请稍后再试',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', globalLimiter);

// 登录/注册接口更严格的限制：每个IP每分钟最多10次
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    code: 429,
    message: '操作太频繁，请1分钟后再试',
  },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ========== 3. 静态文件服务（上传的商品图片） ==========
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ========== 4. 健康检查 ==========
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ========== 5. API 路由 ==========
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/pay', payRoutes);

// ========== 6. 错误处理（必须放在路由之后） ==========
app.use(notFound);
app.use(errorHandler);

// ========== 7. 启动服务 ==========
const PORT = process.env.PORT || 3000;

async function start() {
  // 先测试数据库连接
  await testConnection();

  // 同步数据库模型（开发阶段用 force: false，不删除已有数据）
  // force: true 会删表重建（危险！）
  await sequelize.sync({ force: false, alter: false });
  console.log('✅ 数据库模型同步完成');

  // 启动 HTTP 服务器
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('========================================');
    console.log(`  🍔  外卖系统后端启动成功！`);
    console.log(`  📡  地址: http://localhost:${PORT}`);
    console.log(`  🌍  环境: ${process.env.NODE_ENV || 'development'}`);
    console.log('========================================');
  });

  // 初始化 WebSocket
  const { initSocket } = require('./sockets');
  initSocket(server);
}

start().catch((err) => {
  console.error('❌ 启动失败：', err);
  process.exit(1);
});

module.exports = app;
