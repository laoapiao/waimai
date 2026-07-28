/**
 * 支付接口
 * POST /api/pay/prepay — 创建预支付订单，返回 wx.requestPayment 参数
 * POST /api/pay/notify  — 微信支付结果回调（生产环境用）
 */

const express = require('express');
const crypto = require('crypto');
const { body } = require('express-validator');
const { Order } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { handleValidation } = require('../middleware/validate');

const router = express.Router();

// 是否启用真实支付（需要微信商户号）
const REAL_PAY = !!(process.env.WX_MCH_ID && process.env.WX_MCH_ID !== '你的商户号');

// ====== 签名工具 ======
function generateSign(params, key) {
  const str = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&') + `&key=${key}`;
  return crypto.createHash('md5').update(str).digest('hex').toUpperCase();
}

// ====== POST /api/pay/prepay ======
router.post('/prepay', requireAuth, [
  body('orderId').isInt().withMessage('订单ID无效'),
  handleValidation,
], async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findByPk(orderId);
    if (!order) return res.status(404).json({ code: 404, message: '订单不存在' });
    if (order.customer_id !== req.user.id) return res.status(403).json({ code: 403, message: '无权操作' });

    if (REAL_PAY) {
      // === 真实微信支付 ===
      const appid = process.env.WX_APPID;
      const mch_id = process.env.WX_MCH_ID;
      const mch_key = process.env.WX_MCH_KEY;
      const notify_url = process.env.FILE_BASE_URL + '/api/pay/notify';

      const params = {
        appid, mch_id,
        nonce_str: crypto.randomBytes(16).toString('hex'),
        body: '阿飘菜市-订单' + order.order_no,
        out_trade_no: order.order_no,
        total_fee: Math.round(parseFloat(order.total_price) * 100), // 分
        spbill_create_ip: req.ip || '127.0.0.1',
        notify_url,
        trade_type: 'JSAPI',
        openid: req.user.wx_openid || '',
      };
      params.sign = generateSign(params, mch_key);

      // 实际应在后端用 XML 调用微信统一下单接口，这里简化处理
      // 返回 prepay 参数给前端调用 wx.requestPayment
      const prepayParams = {
        appId: appid,
        timeStamp: String(Math.floor(Date.now() / 1000)),
        nonceStr: params.nonce_str,
        package: `prepay_id=mock_prepay_${order.order_no}`,
        signType: 'MD5',
      };
      prepayParams.paySign = generateSign(prepayParams, mch_key);

      res.json({ code: 200, data: { realPay: true, params: prepayParams } });
    } else {
      // === 开发模式：模拟支付 ===
      // 直接返回成功，前段会调用模拟支付
      res.json({ code: 200, data: { realPay: false, message: '模拟支付模式' } });
    }
  } catch (error) {
    next(error);
  }
});

// ====== POST /api/pay/notify — 微信支付回调 ======
router.post('/notify', async (req, res) => {
  // 微信会在支付成功后回调这个接口
  // 解析XML，验证签名，更新订单状态
  console.log('收到支付回调:', JSON.stringify(req.body));
  res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>');
});

module.exports = router;
