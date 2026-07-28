/**
 * 评价接口
 *
 * POST /api/reviews  — 提交评价（仅顾客）
 * GET  /api/reviews  — 查看评价（商家看全部，顾客看自己的）
 */

const express = require('express');
const { body } = require('express-validator');
const { Review, Order, User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { handleValidation } = require('../middleware/validate');
const { AppError } = require('../utils/errors');

const router = express.Router();

// ========== POST /api/reviews — 提交评价 ==========
router.post('/', [
  requireAuth,
  requireRole('customer'),
  body('order_id').isInt().withMessage('订单ID无效'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分必须是1-5星'),
  body('content').optional().trim(),
  handleValidation,
], async (req, res, next) => {
  try {
    const { order_id, rating, content } = req.body;

    // 1. 检查订单是否存在且属于该顾客
    const order = await Order.findByPk(order_id);
    if (!order) {
      throw new AppError('订单不存在', 404, 404);
    }

    if (order.customer_id !== req.user.id) {
      throw new AppError('只能评价自己的订单', 403, 403);
    }

    // 2. 只有已完成的订单才能评价
    if (order.status !== 'completed') {
      throw new AppError('只能评价已完成的订单', 400, 400);
    }

    // 3. 检查是否已经评价过
    const existing = await Review.findOne({ where: { order_id } });
    if (existing) {
      throw new AppError('该订单已经评价过了', 409, 409);
    }

    // 4. 创建评价
    const review = await Review.create({
      order_id,
      user_id: req.user.id,
      rating,
      content: content || '',
    });

    res.status(201).json({
      code: 200,
      message: '评价成功',
      data: review,
    });
  } catch (error) {
    next(error);
  }
});

// ========== GET /api/reviews — 查看评价 ==========
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { page = 1, page_size = 20 } = req.query;
    const where = {};

    // 顾客只能看自己的评价；商家看所有评价
    if (req.user.role === 'customer') {
      where.user_id = req.user.id;
    }

    const offset = (parseInt(page) - 1) * parseInt(page_size);

    const { count, rows: reviews } = await Review.findAndCountAll({
      where,
      include: [
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'order_no'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'nickname', 'avatar'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(page_size),
      offset,
    });

    res.json({
      code: 200,
      data: {
        list: reviews,
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

module.exports = router;
