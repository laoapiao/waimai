/**
 * 全局错误处理
 *
 * 统一的错误处理中间件，所有没被捕获的错误都会到这里
 * 给前端返回一致的错误格式
 */

/**
 * 自定义错误类
 * 可以带状态码和业务错误码
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 500) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

/**
 * 全局错误捕获中间件
 * 必须放在所有路由的后面
 */
function errorHandler(err, req, res, _next) {
  console.error('❌ 错误：', err);

  // Sequelize 数据库验证错误
  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      code: 422,
      message: '数据验证失败',
      errors: err.errors.map(e => ({ field: e.path, message: e.message })),
    });
  }

  // Sequelize 唯一性冲突（如重复的手机号）
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || '字段';
    return res.status(409).json({
      code: 409,
      message: `该${field}已存在`,
    });
  }

  // 自定义业务错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      message: err.message,
    });
  }

  // 未知错误（不把具体错误信息暴露给前端，防止信息泄露）
  res.status(500).json({
    code: 500,
    message: process.env.NODE_ENV === 'development'
      ? err.message   // 开发环境：显示详细错误
      : '服务器内部错误', // 生产环境：模糊处理
  });
}

/**
 * 404 处理（所有未匹配的路由）
 */
function notFound(req, res) {
  res.status(404).json({
    code: 404,
    message: `接口 ${req.method} ${req.path} 不存在`,
  });
}

module.exports = { AppError, errorHandler, notFound };
