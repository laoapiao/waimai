/**
 * 店铺设置接口
 * GET  /api/settings — 获取店铺设置
 * PUT  /api/settings — 更新店铺设置（含logo上传）
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/role');

const router = express.Router();

// 设置文件路径
const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

// 上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const uniqueName = 'logo-' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});
const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  cb(allowed.includes(file.mimetype) ? null : new Error('只允许上传图片'), allowed.includes(file.mimetype));
};
const upload = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 2 * 1024 * 1024 } });

// 读取设置
function readSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    }
  } catch (e) { /* ignore */ }
  return { shopName: '阿飘菜市', logo: null, announcement: '' };
}

// 写入设置
function writeSettings(data) {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

// ========== GET /api/settings ==========
router.get('/', (req, res) => {
  res.json({ code: 200, data: readSettings() });
});

// ========== PUT /api/settings（仅商家） ==========
router.put('/', requireAuth, requireRole('merchant'), upload.single('logo'), (req, res) => {
  const settings = readSettings();

  if (req.body.shopName) settings.shopName = req.body.shopName;
  if (req.body.announcement !== undefined) settings.announcement = req.body.announcement;
  if (req.file) {
    settings.logo = (process.env.FILE_BASE_URL || '') + '/uploads/' + req.file.filename;
  }

  writeSettings(settings);
  res.json({ code: 200, message: '保存成功', data: settings });
});

module.exports = router;
