/**
 * 商品接口
 *
 * GET    /api/products      — 获取商品列表（所有人可看）
 * GET    /api/products/:id  — 获取商品详情
 * POST   /api/products      — 添加商品（仅商家，含图片上传）
 * PUT    /api/products/:id  — 修改商品（仅商家）
 * DELETE /api/products/:id  — 删除商品（仅商家）
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { Product, Category } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

// ========== 配置文件上传（multer） ==========
const storage = multer.diskStorage({
  // 上传的文件存到 uploads 目录
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  // 文件名：时间戳 + 随机数 + 原始扩展名
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e6);
    const ext = path.extname(file.originalname);
    cb(null, uniqueName + ext);
  },
});

// 文件过滤器：只允许图片
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传 JPG、PNG、GIF、WebP 格式的图片'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024, // 默认5MB
  },
});

// ========== GET /api/products — 获取商品列表 ==========
router.get('/', async (req, res, next) => {
  try {
    const { category_id, is_available, keyword, page = 1, page_size = 20 } = req.query;

    // 构建查询条件
    const where = {};

    // 顾客端只看到上架商品；商家管理端可以看到全部
    if (is_available !== undefined) {
      where.is_available = is_available === 'true';
    }

    if (category_id) {
      where.category_id = category_id;
    }

    if (keyword) {
      where.name = { [require('sequelize').Op.like]: `%${keyword}%` };
    }

    const offset = (parseInt(page) - 1) * parseInt(page_size);

    const { count, rows: products } = await Product.findAndCountAll({
      where,
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      }],
      order: [['created_at', 'DESC']],
      limit: parseInt(page_size),
      offset,
    });

    res.json({
      code: 200,
      data: {
        list: products,
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

// ========== GET /api/products/:id — 获取商品详情 ==========
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{
        model: Category,
        as: 'category',
        attributes: ['id', 'name'],
      }],
    });

    if (!product) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }

    res.json({ code: 200, data: product });
  } catch (error) {
    next(error);
  }
});

// ========== POST /api/products — 添加商品（仅商家） ==========
router.post('/', [
  requireAuth,
  requireRole('merchant'),
  upload.single('image'),  // 接收上传的图片（字段名 image）
  body('name').trim().notEmpty().withMessage('商品名称不能为空'),
  body('price').isFloat({ min: 0.01 }).withMessage('价格必须大于0'),
  body('category_id').isInt().withMessage('请选择分类'),
  handleValidation,
], async (req, res, next) => {
  try {
    const { name, price, description, category_id, is_available } = req.body;

    // 检查分类是否存在
    const category = await Category.findByPk(category_id);
    if (!category) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }

    // 图片路径（如果有上传）
    const imagePath = req.file ? (process.env.FILE_BASE_URL || '') + '/uploads/' + req.file.filename : null;

    const product = await Product.create({
      name,
      price,
      description,
      category_id,
      is_available: is_available !== undefined ? is_available : true,
      image: imagePath,
    });

    res.status(201).json({
      code: 200,
      message: '商品添加成功',
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// ========== PUT /api/products/:id — 修改商品（仅商家） ==========
router.put('/:id', [
  requireAuth,
  requireRole('merchant'),
  upload.single('image'),
  body('name').optional().trim().notEmpty().withMessage('商品名称不能为空'),
  body('price').optional().isFloat({ min: 0.01 }).withMessage('价格必须大于0'),
  handleValidation,
], async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }

    const { name, price, description, category_id, is_available } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) updateData.description = description;
    if (category_id !== undefined) updateData.category_id = category_id;
    if (is_available !== undefined) updateData.is_available = is_available;

    // 如果上传了新图片，更新图片路径
    if (req.body.clear_image === 'true') {
      updateData.image = null;
    } else if (req.file) {
      updateData.image = (process.env.FILE_BASE_URL || '') + '/uploads/' + req.file.filename;
    }

    await product.update(updateData);

    res.json({
      code: 200,
      message: '商品修改成功',
      data: product,
    });
  } catch (error) {
    next(error);
  }
});

// ========== DELETE /api/products/:id — 删除商品（仅商家） ==========
router.delete('/:id', requireAuth, requireRole('merchant'), async (req, res, next) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ code: 404, message: '商品不存在' });
    }

    await product.destroy();

    res.json({ code: 200, message: '商品已删除' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
