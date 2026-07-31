/**
 * 提现接口
 * POST /api/withdraw — 申请提现
 * GET  /api/withdraw — 提现记录
 */

const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { handleValidation } = require('../middleware/validate');
const { User } = require('../models');
const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

const router = express.Router();

// 提现记录模型
const Withdrawal = sequelize.define('Withdrawal', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  account: { type: DataTypes.STRING(200), allowNull: true, comment: '收款账号' },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
}, { tableName: 'withdrawals', timestamps: true, underscored: true });

// ====== POST /api/withdraw ======
router.post('/', requireAuth, requireRole('rider', 'merchant'), [
  body('amount').isFloat({ min: 10 }).withMessage('提现金额至少 ¥10'),
  handleValidation,
], async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount);
    const account = req.body.account || '';
    const user = req.user;

    if (parseFloat(user.balance) < amount) {
      return res.status(400).json({ code: 400, message: `余额不足，当前余额 ¥${parseFloat(user.balance).toFixed(2)}` });
    }

    // 扣减余额 + 创建提现记录
    await sequelize.transaction(async (t) => {
      await user.update({ balance: (parseFloat(user.balance) - amount).toFixed(2) }, { transaction: t });
      await Withdrawal.create({ user_id: user.id, amount, account, status: 'pending' }, { transaction: t });
    });

    res.json({ code: 200, message: '提现申请已提交，等待审核', data: { balance: (parseFloat(user.balance) - amount).toFixed(2) } });
  } catch (error) {
    next(error);
  }
});

// ====== GET /api/withdraw ======
router.get('/', requireAuth, requireRole('rider', 'merchant'), async (req, res, next) => {
  try {
    const list = await Withdrawal.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
      limit: 20,
    });
    res.json({ code: 200, data: { list, balance: req.user.balance } });
  } catch (error) { next(error); }
});

module.exports = router;
