/**
 * 意见反馈接口
 * POST /api/feedback     — 顾客提交反馈
 * GET  /api/feedback     — 商家查看所有反馈
 */

const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { handleValidation } = require('../middleware/validate');
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const router = express.Router();

// 简单定义 Feedback 模型（轻量，不建独立 model 文件）
const Feedback = sequelize.define('Feedback', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  content: { type: DataTypes.TEXT, allowNull: false, comment: '反馈内容' },
  contact: { type: DataTypes.STRING(100), allowNull: true, comment: '联系方式' },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'feedbacks', timestamps: true, underscored: true });

// ========== POST /api/feedback — 提交反馈 ==========
router.post('/', requireAuth, [
  body('content').trim().notEmpty().withMessage('请输入反馈内容'),
  handleValidation,
], async (req, res, next) => {
  try {
    const { content, contact } = req.body;
    await Feedback.create({ content, contact: contact || '', user_id: req.user.id });
    res.status(201).json({ code: 200, message: '感谢反馈！' });
  } catch (error) { next(error); }
});

// ========== GET /api/feedback — 商家查看反馈 ==========
router.get('/', requireAuth, requireRole('merchant'), async (req, res, next) => {
  try {
    const { page = 1, page_size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(page_size);
    const { count, rows } = await Feedback.findAndCountAll({
      order: [['created_at', 'DESC']],
      limit: parseInt(page_size), offset,
      include: [{ model: require('../models').User, as: 'user', attributes: ['id', 'nickname'] }],
    });
    res.json({ code: 200, data: { list: rows, total: count } });
  } catch (error) { next(error); }
});

// 关联
Feedback.belongsTo(require('../models').User, { foreignKey: 'user_id', as: 'user' });

module.exports = router;
