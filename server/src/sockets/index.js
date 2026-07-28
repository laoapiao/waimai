/**
 * WebSocket 实时通信
 *
 * 事件列表：
 * - order:new          新订单 → 推送给商家和骑手
 * - order:status       订单状态变更 → 推送给顾客和商家
 * - order:accepted     骑手接单 → 推送给顾客和商家
 * - rider:location     骑手上报位置 → 推送给对应顾客
 * - rider:join_order   骑手加入订单追踪 → 关联骑手和订单
 */

const jwt = require('jsonwebtoken');
const { User, Order } = require('../models');

let io = null;

// 内存中存储骑手位置 { riderId: { lat, lng, orderId, updatedAt } }
const riderLocations = new Map();

/**
 * 初始化 WebSocket 服务
 */
function initSocket(server) {
  const { Server } = require('socket.io');

  io = new Server(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? (process.env.CORS_ORIGIN || 'https://yourdomain.com').split(',')
        : '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
  });

  // ========== JWT 认证 ==========
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('请先登录'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);

      if (!user || user.status === 'disabled') {
        return next(new Error('账号无效'));
      }

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('认证失败'));
    }
  });

  // ========== 连接处理 ==========
  io.on('connection', (socket) => {
    const { user } = socket;
    console.log(`🔗 WebSocket: ${user.nickname} (${user.role})`);

    // 加入角色房间
    if (user.role === 'merchant') socket.join('merchants');
    if (user.role === 'rider') socket.join('riders');

    // 个人房间（精确推送）
    socket.join(`user:${user.id}`);

    // ========== 骑手上报位置 ==========
    socket.on('rider:location', (data) => {
      const { lat, lng, orderId } = data;
      if (!lat || !lng) return;

      // 存储位置
      riderLocations.set(user.id, {
        lat, lng,
        orderId: orderId || null,
        riderName: user.nickname,
        riderPhone: user.phone,
        updatedAt: new Date(),
      });

      // 如果有订单ID，推送给该订单的顾客
      if (orderId) {
        Order.findByPk(orderId).then(order => {
          if (order && order.customer_id) {
            io.to(`user:${order.customer_id}`).emit('rider:location', {
              lat, lng,
              riderName: user.nickname,
              riderPhone: user.phone,
              orderId,
            });
          }
        }).catch(() => {});
      }
    });

    // ========== 骑手关联订单（开始配送时调用） ==========
    socket.on('rider:join_order', (data) => {
      const { orderId } = data;
      if (orderId) {
        const existing = riderLocations.get(user.id);
        if (existing) {
          riderLocations.set(user.id, { ...existing, orderId });
        }
      }
    });

    // ========== 顾客获取骑手位置 ==========
    socket.on('rider:get_location', async (data) => {
      const { orderId } = data;
      try {
        const order = await Order.findByPk(orderId);
        if (order && order.rider_id) {
          const location = riderLocations.get(order.rider_id);
          if (location) {
            socket.emit('rider:location', {
              ...location,
              orderId,
            });
          }
        }
      } catch (err) { /* ignore */ }
    });

    // ========== 断开清理 ==========
    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket 断开: ${user.nickname}`);
      // 骑手断连，清理位置（可选：保留一段时间）
      if (user.role === 'rider') {
        riderLocations.delete(user.id);
      }
    });
  });

  console.log('✅ WebSocket 服务启动成功');
  return io;
}

/**
 * 获取 IO 实例
 */
function getIO() {
  return io;
}

/**
 * 获取骑手位置（供 HTTP 接口用）
 */
function getRiderLocation(riderId) {
  return riderLocations.get(riderId) || null;
}

module.exports = { initSocket, getIO, getRiderLocation };
