/**
 * JWT 认证中间件
 *
 * 作用：验证请求的人是不是已经登录了
 *
 * 工作流程：
 * 1. 从请求头中取出 token（就像门禁卡）
 * 2. 验证 token 是否有效
 * 3. 如果有效，把用户信息放到 req.user 里，供后续使用
 * 4. 如果无效，返回 401（未授权）
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * 必须登录才能访问
 */
async function requireAuth(req, res, next) {
  try {
    // 1. 取出门禁卡（token）
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        message: '请先登录',
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. 验证门禁卡是否有效
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        code: 401,
        message: '登录已过期，请重新登录',
      });
    }

    // 3. 根据 token 中的用户ID查出最新的用户信息
    const user = await User.findByPk(decoded.id);

    if (!user) {
      return res.status(401).json({
        code: 401,
        message: '账号不存在',
      });
    }

    if (user.status === 'disabled') {
      return res.status(403).json({
        code: 403,
        message: '账号已被禁用',
      });
    }

    // 4. 把用户信息挂到 req 上，后面的代码可以直接用
    req.user = user;
    next();
  } catch (error) {
    console.error('认证中间件错误：', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
    });
  }
}

/**
 * 可选认证（不强制登录，但如果带了token就解析）
 * 用于：商品列表等接口（登录和没登录都能看，但登录了可以显示个性化内容）
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id);
      req.user = user;  // 可能是 null
    }
    next();
  } catch (error) {
    // token 无效也不报错，就当没登录
    req.user = null;
    next();
  }
}

module.exports = { requireAuth, optionalAuth };
