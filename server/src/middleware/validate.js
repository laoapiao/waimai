/**
 * 输入验证中间件
 *
 * 作用：检查用户提交的数据是否合法
 * 防止空数据、格式错误等问题
 *
 * 使用 express-validator 库
 */

const { validationResult } = require('express-validator');

/**
 * 检查验证结果，如果有错误就返回 422
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      code: 422,
      message: '输入数据有误',
      errors: errors.array().map(e => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
}

/**
 * 常用的验证规则
 */
const rules = {
  // 手机号验证
  phone: {
    isMobilePhone: {
      options: ['zh-CN'],
      errorMessage: '请输入正确的手机号',
    },
  },

  // 密码验证（最少6位）
  password: {
    isLength: {
      options: { min: 6 },
      errorMessage: '密码不能少于6位',
    },
  },

  // 必填字段
  required: (fieldName) => ({
    notEmpty: {
      errorMessage: `${fieldName}不能为空`,
    },
  }),
};

module.exports = { handleValidation, rules };
