/**
 * 角色权限中间件
 *
 * 作用：检查用户有没有权限执行某个操作
 * 例如：只有商家能添加商品，普通顾客不能
 *
 * 用法：
 *   router.post('/products', requireRole('merchant'), handler);
 */

/**
 * 检查用户角色
 * @param  {...string} roles  允许访问的角色（可传多个）
 * 例如：
 *   requireRole('merchant')          — 只有商家
 *   requireRole('merchant', 'rider') — 商家或骑手都可以
 */
function requireRole(...roles) {
  return (req, res, next) => {
    // requireAuth 必须先执行，确保 req.user 存在
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        message: '请先登录',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 403,
        message: '没有权限执行此操作',
      });
    }

    next();
  };
}

module.exports = { requireRole };
