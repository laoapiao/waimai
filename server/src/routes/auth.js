/**
 * 认证接口（注册 / 登录 / 获取个人信息）
 *
 * POST /api/auth/register  — 注册
 * POST /api/auth/login     — 登录
 * GET  /api/auth/me        — 获取当前用户信息
 */

const express = require('express');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { User } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');
const { AppError } = require('../utils/errors');

const router = express.Router();

// 头像上传配置
const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  cb(allowed.includes(file.mimetype) ? null : new Error('只允许上传图片'), allowed.includes(file.mimetype));
};

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
    filename: (req, file, cb) => cb(null, 'avatar-' + req.user.id + '-' + Date.now() + path.extname(file.originalname)),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

// ========== 生成 JWT 令牌 ==========
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },  // 令牌里存什么（不存敏感信息）
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ========== 隐藏敏感字段 ==========
function toSafeUser(user) {
  const { password, ...safeUser } = user.toJSON();
  return safeUser;
}

// ========== 隐藏密码的更新——只允许更新非敏感字段 ==========
const ALLOWED_UPDATES = ['nickname', 'avatar', 'is_online', 'max_orders', 'payment_account'];

// ========== POST /api/auth/register — 注册 ==========
router.post('/register', [
  // 验证输入
  body('phone').isMobilePhone('zh-CN').withMessage('请输入正确的手机号'),
  body('password').isLength({ min: 6 }).withMessage('密码不能少于6位'),
  body('role').isIn(['customer', 'merchant', 'rider']).withMessage('角色无效'),
  body('nickname').optional().trim().isLength({ min: 1, max: 50 }),
  handleValidation,
], async (req, res, next) => {
  try {
    const { phone, password, role, nickname } = req.body;

    // 1. 检查手机号是否已注册
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      throw new AppError('该手机号已注册', 409, 409);
    }

    // 2. 加密密码（bcrypt — 即使数据库泄露也解不出明文密码）
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. 创建用户
    const user = await User.create({
      phone,
      password: hashedPassword,
      role,
      nickname: nickname || `用户${phone.slice(-4)}`,
    });

    // 4. 生成 token
    const token = generateToken(user);

    res.status(201).json({
      code: 200,
      message: '注册成功',
      data: {
        user: toSafeUser(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== POST /api/auth/login — 登录 ==========
router.post('/login', [
  body('phone').isMobilePhone('zh-CN').withMessage('请输入正确的手机号'),
  body('password').notEmpty().withMessage('请输入密码'),
  handleValidation,
], async (req, res, next) => {
  try {
    const { phone, password } = req.body;

    // 1. 查找用户
    const user = await User.findOne({ where: { phone } });
    if (!user) {
      throw new AppError('手机号未注册', 401, 401);
    }

    // 2. 检查账号状态
    if (user.status === 'disabled') {
      throw new AppError('账号已被禁用，请联系管理员', 403, 403);
    }

    // 3. 验证密码
    // 微信登录的顾客可能没有密码
    if (!user.password) {
      throw new AppError('该账号未设置密码，请使用微信登录', 401, 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('密码错误', 401, 401);
    }

    // 4. 生成 token
    const token = generateToken(user);

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        user: toSafeUser(user),
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ========== POST /api/auth/wechat-login — 微信一键登录 ==========
router.post('/wechat-login', [
  body('code').notEmpty().withMessage('缺少微信code'),
  handleValidation,
], async (req, res, next) => {
  try {
    const { code, nickname, avatar } = req.body;
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;

    let openid = null;

    // 有真实appid时调用微信接口，否则用code模拟
    if (appid && secret && appid !== '你的小程序AppID') {
      const https = require('https');
      const wxRes = await new Promise((resolve, reject) => {
        https.get(`https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`, (resp) => {
          let data = '';
          resp.on('data', chunk => data += chunk);
          resp.on('end', () => resolve(JSON.parse(data)));
        }).on('error', reject);
      });
      openid = wxRes.openid;
      if (!openid) {
        return res.status(400).json({ code: 400, message: '微信登录失败: ' + (wxRes.errmsg || '未知错误') });
      }
    } else {
      // 开发模式：用code的一部分模拟openid
      openid = 'dev_' + (code || Date.now().toString(36));
    }

    // 查找或创建用户
    let user = await User.findOne({ where: { wx_openid: openid } });
    if (!user) {
      user = await User.create({
        wx_openid: openid,
        role: 'customer',
        nickname: nickname || '新顾客',
        avatar: avatar || null,
      });
    } else {
      // 更新昵称和头像
      if (nickname) user.nickname = nickname;
      if (avatar) user.avatar = avatar;
      await user.save();
    }

    const token = generateToken(user);
    res.json({
      code: 200,
      message: '微信登录成功',
      data: { user: toSafeUser(user), token },
    });
  } catch (error) {
    next(error);
  }
});

// ========== GET /api/auth/me — 获取当前用户信息 ==========
router.get('/me', requireAuth, async (req, res) => {
  res.json({ code: 200, data: toSafeUser(req.user) });
});

// ========== PUT /api/auth/me — 更新个人信息（含头像上传） ==========
router.put('/me', requireAuth, avatarUpload.single('avatar'), async (req, res, next) => {
  try {
    const updates = {};
    // 头像上传
    if (req.file) {
      updates.avatar = (process.env.FILE_BASE_URL || '') + '/uploads/' + req.file.filename;
    }
    for (const key of ALLOWED_UPDATES) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // 骑手设置最大接单数：缴了保证金才能 >1
    if (updates.max_orders !== undefined && updates.max_orders > 1) {
      const deposit = parseFloat(req.user.deposit) || 0;
      if (deposit < 200) {
        return res.status(400).json({ code: 400, message: '需要缴纳 ¥200 保证金才能多单配送' });
      }
      if (updates.max_orders > 20) updates.max_orders = 20;
    }

    await req.user.update(updates);
    res.json({ code: 200, message: '更新成功', data: toSafeUser(req.user) });
  } catch (error) {
    next(error);
  }
});

// ========== POST /api/auth/deposit — 缴纳保证金（模拟） ==========
router.post('/deposit', requireAuth, async (req, res, next) => {
  try {
    const amount = parseFloat(req.body.amount) || 200;
    const currentDeposit = parseFloat(req.user.deposit) || 0;
    await req.user.update({ deposit: (currentDeposit + amount).toFixed(2) });
    res.json({ code: 200, message: `成功缴纳 ¥${amount} 保证金`, data: toSafeUser(req.user) });
  } catch (error) {
    next(error);
  }
});

// ========== GET /api/rider/stats — 骑手今日统计 ==========
router.get('/rider/stats', requireAuth, async (req, res, next) => {
  try {
    const { Op } = require('sequelize');
    const { Order } = require('../models');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedOrders = await Order.findAll({
      where: {
        rider_id: req.user.id,
        status: 'completed',
        updated_at: { [Op.gte]: today },
      },
    });

    const todayCount = completedOrders.length;
    const todayEarnings = completedOrders.reduce((sum, o) => sum + parseFloat(o.delivery_fee || 5), 0);

    // 正在配送中的订单数
    const activeCount = await Order.count({
      where: {
        rider_id: req.user.id,
        status: ['accepted', 'arrived', 'delivering'],
      },
    });

    res.json({
      code: 200,
      data: { todayCount, todayEarnings: todayEarnings.toFixed(2), activeCount },
    });
  } catch (error) {
    next(error);
  }
});

// ========== 短信验证码 ==========
const { sendCode: sendSMS } = require('../utils/sms');
const smsCodes = new Map();

router.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ code: 400, message: '请输入手机号' });
  try {
    const code = await sendSMS(phone);
    smsCodes.set(phone, { code, time: Date.now() });
    res.json({ code: 200, message: '验证码已发送' });
  } catch (err) {
    res.status(500).json({ code: 500, message: err.message || '发送失败' });
  }
});

router.post('/verify-code', async (req, res) => {
  const { phone, code } = req.body;
  if (!phone || !code) return res.status(400).json({ code: 400, message: '参数错误' });
  const record = smsCodes.get(phone);
  if (!record || record.code !== code) return res.status(400).json({ code: 400, message: '验证码错误' });
  if (Date.now() - record.time > 5 * 60 * 1000) return res.status(400).json({ code: 400, message: '验证码已过期' });
  smsCodes.delete(phone);

  let user = await User.findOne({ where: { phone } });
  if (!user) {
    user = await User.create({ phone, role: 'rider', nickname: '骑手' + phone.slice(-4) });
  }
  const token = generateToken(user);
  res.json({ code: 200, message: '登录成功', data: { user: toSafeUser(user), token } });
});

module.exports = router;
