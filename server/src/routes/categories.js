/**
 * 商品分类接口
 *
 * GET    /api/categories     — 获取所有分类（所有人可看）
 * POST   /api/categories     — 添加分类（仅商家）
 * PUT    /api/categories/:id — 修改分类（仅商家）
 * DELETE /api/categories/:id — 删除分类（仅商家）
 */

const express = require('express');
const path = require('path');
const multer = require('multer');
const { body } = require('express-validator');
const { Category, Product } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

// 文件上传配置（和商品共用 uploads 目录）
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});
const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  cb(allowed.includes(file.mimetype) ? null : new Error('只允许上传图片'), allowed.includes(file.mimetype));
};

const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024 },
});

// ========== GET /api/categories — 获取所有分类 ==========
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.findAll({
      order: [['sort_order', 'ASC']],
      include: [{
        model: Product,
        as: 'products',
        where: { is_available: true },  // 只返回上架的商品
        required: false,                 // 即使分类下没商品也显示分类
        attributes: ['id', 'name', 'price', 'image', 'sales_count'],
      }],
    });

    res.json({
      code: 200,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
});

// ========== POST /api/categories — 添加分类（仅商家，支持图标上传） ==========
router.post('/', [
  requireAuth,
  requireRole('merchant'),
  upload.single('icon_image'),
  body('name').trim().notEmpty().withMessage('分类名称不能为空'),
  handleValidation,
], async (req, res, next) => {
  try {
    const { name, sort_order, icon } = req.body;
    // 优先用上传的图片，其次用 emoji 图标
    const iconUrl = req.file
      ? (process.env.FILE_BASE_URL || '') + '/uploads/' + req.file.filename
      : (icon || null);

    const category = await Category.create({ name, sort_order, icon: iconUrl });

    res.status(201).json({
      code: 200,
      message: '分类添加成功',
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// ========== PUT /api/categories/:id — 修改分类（仅商家，支持图标上传） ==========
router.put('/:id', [
  requireAuth,
  requireRole('merchant'),
  upload.single('icon_image'),
  body('name').optional().trim().notEmpty().withMessage('分类名称不能为空'),
  handleValidation,
], async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }

    const { name, sort_order, icon } = req.body;
    const updateData = { name, sort_order };
    // 有上传新图片 → 更新，否则保留旧的（或用手动输入的 icon）
    if (req.file) {
      updateData.icon = (process.env.FILE_BASE_URL || '') + '/uploads/' + req.file.filename;
    } else if (icon !== undefined) {
      updateData.icon = icon || null;
    }
    await category.update(updateData);

    res.json({
      code: 200,
      message: '分类修改成功',
      data: category,
    });
  } catch (error) {
    next(error);
  }
});

// ========== DELETE /api/categories/:id — 删除分类（仅商家） ==========
router.delete('/:id', requireAuth, requireRole('merchant'), async (req, res, next) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ code: 404, message: '分类不存在' });
    }

    // 检查分类下是否有商品
    const productCount = await Product.count({ where: { category_id: req.params.id } });
    if (productCount > 0) {
      return res.status(400).json({
        code: 400,
        message: `该分类下有 ${productCount} 个商品，请先删除或移走商品`,
      });
    }

    await category.destroy();

    res.json({ code: 200, message: '分类已删除' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
