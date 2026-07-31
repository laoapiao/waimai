/**
 * 订单接口
 *
 * POST /api/orders           — 顾客下单
 * GET  /api/orders           — 获取订单列表
 * GET  /api/orders/:id       — 获取订单详情
 * PUT  /api/orders/:id/status — 更新订单状态
 * PUT  /api/orders/:id/accept — 骑手接单
 */

const express = require('express');
const { body } = require('express-validator');
const { sequelize, Order, OrderItem, Product, User, Review } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { handleValidation } = require('../middleware/validate');
const { AppError } = require('../utils/errors');
const { getIO, getRiderLocation } = require('../sockets');

const router = express.Router();

// ========== 生成订单编号 ==========
function generateOrderNo() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${date}${random}`;
}

// ========== POST /api/orders — 顾客下单 ==========
router.post('/', [
  requireAuth,
  requireRole('customer'),
  body('items').isArray({ min: 1 }).withMessage('请选择至少一个商品'),
  body('items.*.product_id').isInt().withMessage('商品ID无效'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('数量至少为1'),
  body('delivery_address').trim().notEmpty().withMessage('请输入配送地址'),
  body('contact_phone').isMobilePhone('zh-CN').withMessage('请输入正确的联系电话'),
  handleValidation,
], async (req, res, next) => {
  try {
    const { items, delivery_address, contact_phone, remark, lat, lng } = req.body;

    // 1. 查询所有要购买的商品，计算总价
    let totalPrice = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id);

      if (!product) {
        throw new AppError(`商品ID ${item.product_id} 不存在`, 404, 404);
      }

      if (!product.is_available) {
        throw new AppError(`商品"${product.name}"已下架`, 400, 400);
      }

      const subtotal = parseFloat(product.price) * item.quantity;
      totalPrice += subtotal;

      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
      });
    }

    // 2. 用数据库事务创建订单（防止孤儿订单）
    const order = await sequelize.transaction(async (t) => {
      const newOrder = await Order.create({
        order_no: generateOrderNo(),
        customer_id: req.user.id,
        total_price: totalPrice.toFixed(2),
        delivery_address,
        contact_phone,
        remark: remark || '',
        lat: lat || null,
        lng: lng || null,
        status: 'pending',
      }, { transaction: t });

      // 批量创建订单明细
      await OrderItem.bulkCreate(
        orderItems.map(item => ({ ...item, order_id: newOrder.id })),
        { transaction: t }
      );

      return newOrder;
    });

    // 3. 查询完整的订单信息（含关联数据）
    const fullOrder = await Order.findByPk(order.id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image'] }],
        },
        { model: User, as: 'customer', attributes: ['id', 'nickname', 'phone'] },
      ],
    });

    // 6. WebSocket 实时通知：新订单推送给商家和骑手
    const io = getIO();
    if (io) {
      io.to('merchants').emit('order:new', fullOrder);
      // 只推送给在线的骑手
      const riderSockets = await io.in('riders').fetchSockets();
      for (const s of riderSockets) {
        if (s.user && s.user.is_online) {
          s.emit('order:new', fullOrder);
        }
      }
    }

    res.status(201).json({
      code: 200,
      message: '下单成功',
      data: fullOrder,
    });
  } catch (error) {
    next(error);
  }
});

// ========== GET /api/orders — 获取订单列表 ==========
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, page = 1, page_size = 20 } = req.query;
    const where = {};

    // 不同角色看到不同的订单
    if (req.user.role === 'customer') {
      // 顾客只能看自己的订单
      where.customer_id = req.user.id;
    } else if (req.user.role === 'rider') {
      // 骑手看到待接单的 + 自己接的
      // 这里简化：返回所有非顾客专属的订单
    }
    // 商家可以看到所有订单

    if (status) {
      where.status = status;
    }

    const offset = (parseInt(page) - 1) * parseInt(page_size);

    const { count, rows: orders } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image'] }],
        },
        { model: User, as: 'customer', attributes: ['id', 'nickname', 'phone'] },
        { model: User, as: 'rider', attributes: ['id', 'nickname', 'phone'] },
        { model: Review, as: 'review' },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(page_size),
      offset,
    });

    res.json({
      code: 200,
      data: {
        list: orders,
        total: count,
        page: parseInt(page),
        page_size: parseInt(page_size),
        total_pages: Math.ceil(count / parseInt(page_size)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== GET /api/orders/:id — 获取订单详情 ==========
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image'] }],
        },
        { model: User, as: 'customer', attributes: ['id', 'nickname', 'phone'] },
        { model: User, as: 'rider', attributes: ['id', 'nickname', 'phone'] },
        { model: Review, as: 'review' },
      ],
    });

    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    // 权限检查：顾客只能看自己的订单
    if (req.user.role === 'customer' && order.customer_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权查看此订单' });
    }

    res.json({ code: 200, data: order });
  } catch (error) {
    next(error);
  }
});

// ========== PUT /api/orders/:id/status — 更新订单状态 ==========
router.put('/:id/status', [
  requireAuth,
  body('status').isIn(['accepted', 'arrived', 'delivering', 'completed', 'cancelled']).withMessage('状态无效'),
  handleValidation,
], async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    const { status } = req.body;

    // 权限和状态流转校验
    const validTransitions = {
      pending: ['accepted', 'cancelled'],
      accepted: ['arrived', 'cancelled'],
      arrived: ['delivering', 'cancelled'],
      delivering: ['completed'],
    };

    const allowedNext = validTransitions[order.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        code: 400,
        message: `不能从"${order.status}"变为"${status}"`,
      });
    }

    // 角色权限：
    // - 商家可以：确认接单(accepted)、取消(cancelled)
    // - 骑手可以：开始配送(delivering)、完成(completed)
    if (status === 'accepted' && req.user.role !== 'merchant') {
      return res.status(403).json({ code: 403, message: '只有商家可以确认接单' });
    }
    if (['arrived', 'delivering', 'completed'].includes(status) && req.user.role !== 'rider') {
      return res.status(403).json({ code: 403, message: '只有骑手可以更新配送状态' });
    }

    await order.update({ status });

    // 订单完成时增加商品销量（取消时不加）
    if (status === 'completed') {
      const items = await OrderItem.findAll({ where: { order_id: order.id } });
      for (const item of items) {
        await Product.increment('sales_count', {
          by: item.quantity,
          where: { id: item.product_id },
        });
      }
    }

    // WebSocket 通知：状态变更推送给顾客
    const io = getIO();
    if (io) {
      const fullOrder = await Order.findByPk(order.id, {
        include: [
          { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
          { model: User, as: 'customer', attributes: ['id', 'nickname'] },
          { model: User, as: 'rider', attributes: ['id', 'nickname'] },
        ],
      });
      // 推送给对应顾客
      io.to(`user:${order.customer_id}`).emit('order:status', fullOrder);
      // 也推送给商家
      io.to('merchants').emit('order:status', fullOrder);
    }

    res.json({
      code: 200,
      message: '订单状态已更新',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// ========== PUT /api/orders/:id/accept — 骑手接单 ==========
router.put('/:id/accept', requireAuth, requireRole('rider'), async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({
        code: 400,
        message: '订单已被其他人接走或已取消',
      });
    }

    // 骑手接单：状态从 pending → accepted，同时记录骑手ID
    await order.update({
      status: 'accepted',
      rider_id: req.user.id,
    });

    // WebSocket 通知
    const io = getIO();
    if (io) {
      const fullOrder = await Order.findByPk(order.id, {
        include: [
          { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] },
          { model: User, as: 'customer', attributes: ['id', 'nickname'] },
          { model: User, as: 'rider', attributes: ['id', 'nickname'] },
        ],
      });
      io.to(`user:${order.customer_id}`).emit('order:accepted', fullOrder);
      io.to('merchants').emit('order:accepted', fullOrder);
    }

    res.json({
      code: 200,
      message: '接单成功',
      data: order,
    });
  } catch (error) {
    next(error);
  }
});

// ========== GET /api/orders/:id/location — 获取骑手位置 ==========
router.get('/:id/location', requireAuth, async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) {
      return res.status(404).json({ code: 404, message: '订单不存在' });
    }

    // 只有该订单的顾客和骑手本人可以查看位置
    if (req.user.id !== order.customer_id && req.user.id !== order.rider_id && req.user.role !== 'merchant') {
      return res.status(403).json({ code: 403, message: '无权查看' });
    }

    if (!order.rider_id) {
      return res.json({ code: 200, data: { hasRider: false } });
    }

    const location = getRiderLocation(order.rider_id);
    res.json({
      code: 200,
      data: {
        hasRider: true,
        riderName: location?.riderName || null,
        riderPhone: location?.riderPhone || null,
        lat: location?.lat || null,
        lng: location?.lng || null,
        updatedAt: location?.updatedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
