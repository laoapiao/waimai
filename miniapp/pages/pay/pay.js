/**
 * 支付确认页（模拟支付）
 * 实际支付对接时，替换 handlePay 中的逻辑即可
 */

const { order, auth } = require('../../utils/api');

Page({
  data: {
    cart: [],
    totalPrice: '0.00',
    contactPhone: '',
    address: '',
    lat: null,
    lng: null,
    paying: false,
  },

  async onLoad(options) {
    // 生成幂等键：用户ID + 时间戳 + 随机数，防重复提交
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.idempotencyKey = (userInfo.id || 'u') + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);

    // 确保已登录
    const token = wx.getStorageSync('token');
    if (!token) {
      try {
        const { DEV_MODE } = require('../../utils/config').CONFIG;
        if (!DEV_MODE) { wx.showToast({ title: '请先登录', icon: 'none' }); setTimeout(() => wx.navigateBack(), 1000); return; }
        const result = await auth.login('13800000002', '123456');
        wx.setStorageSync('token', result.data.token);
        wx.setStorageSync('userInfo', result.data.user);
        getApp().globalData.token = result.data.token;
      } catch (err) {
        wx.showToast({ title: '登录失败，请重试', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1000);
        return;
      }
    }

    // 从上一页传来的参数
    const cart = wx.getStorageSync('cart') || [];
    if (cart.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }

    // 预计算每项小计（WXML不支持.toFixed，必须JS里算好）
    const cartWithSubtotal = cart.map(item => ({
      ...item,
      subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
    }));

    const totalPrice = cartWithSubtotal
      .reduce((sum, item) => sum + parseFloat(item.subtotal), 0)
      .toFixed(2);

    this.setData({
      cart: cartWithSubtotal,
      totalPrice,
      contactPhone: decodeURIComponent(options.phone || ''),
      address: decodeURIComponent(options.address || ''),
      remark: decodeURIComponent(options.remark || ''),
      lat: options.lat ? parseFloat(options.lat) : null,
      lng: options.lng ? parseFloat(options.lng) : null,
    });
  },

  // 确认支付（支持真实支付 + 模拟支付）
  async handlePay() {
    this.setData({ paying: true });

    try {
      // 1. 先创建订单
      const items = this.data.cart.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
      }));

      const res = await order.create({
        items,
        delivery_address: this.data.address,
        contact_phone: this.data.contactPhone,
        remark: this.data.remark,
        lat: this.data.lat,
        lng: this.data.lng,
        idempotency_key: this.idempotencyKey,
      });

      const orderId = res.data.id;

      // 2. 调起支付
      const { DEV_MODE } = require('../../utils/config').CONFIG;
      if (!DEV_MODE) {
        // 真实微信支付
        const token = wx.getStorageSync('token');
        const payRes = await new Promise((resolve, reject) => {
          wx.request({
            url: getApp().globalData.baseURL + '/pay/prepay',
            method: 'POST',
            header: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            data: { orderId },
            success: r => r.data.code === 200 ? resolve(r.data.data) : reject(r.data),
            fail: reject,
          });
        });

        if (payRes.realPay) {
          // 调用微信支付
          await new Promise((resolve, reject) => {
            wx.requestPayment({
              ...payRes.params,
              success: resolve,
              fail: reject,
            });
          });
        }
      } else {
        // 开发模式：模拟支付延迟
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // 3. 清空购物车
      wx.removeStorageSync('cart');
      getApp().updateCartBadge();

      wx.showToast({ title: '支付成功！', icon: 'success' });
      setTimeout(() => {
        wx.redirectTo({ url: '/pages/order-detail/order-detail?id=' + orderId });
      }, 800);
    } catch (err) {
      wx.showToast({ title: err.message || '支付失败', icon: 'none' });
    } finally {
      this.setData({ paying: false });
    }
  },
});
