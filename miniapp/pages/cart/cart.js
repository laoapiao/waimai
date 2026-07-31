/**
 * 购物车页面
 */

const { isLogin } = require('../../utils/auth');
const { auth } = require('../../utils/api');

Page({
  data: {
    cart: [],
    totalPrice: '0.00',
    totalCount: 0,
  },

  onShow() {
    this.loadCart();
  },

  loadCart() {
    const cart = (wx.getStorageSync('cart') || []).map(item => ({
      ...item,
      subtotal: (parseFloat(item.price) * item.quantity).toFixed(2),
    }));
    const totalPrice = cart
      .reduce((sum, item) => sum + parseFloat(item.subtotal), 0)
      .toFixed(2);
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    this.setData({ cart, totalPrice, totalCount });
  },

  // 直接删除商品
  removeItem(e) {
    const id = e.currentTarget.dataset.id;
    // 操作原始 storage 数据（不含subtotal），避免数据污染
    let cart = wx.getStorageSync('cart') || [];
    cart = cart.filter(c => c.id !== id);
    wx.setStorageSync('cart', cart);
    getApp().updateCartBadge();
    this.loadCart();
  },

  // 回首页
  goShop() { wx.switchTab({ url: '/pages/index/index' }); },

  // 减少数量
  decrease(e) {
    const id = e.currentTarget.dataset.id;
    let cart = wx.getStorageSync('cart') || [];
    const index = cart.findIndex(c => c.id === id);
    if (index > -1) {
      if (cart[index].quantity > 1) {
        cart[index].quantity -= 1;
      } else {
        cart.splice(index, 1);
      }
    }
    wx.setStorageSync('cart', cart);
    getApp().updateCartBadge();
    this.loadCart();
  },

  // 增加数量
  increase(e) {
    const id = e.currentTarget.dataset.id;
    let cart = wx.getStorageSync('cart') || [];
    const index = cart.findIndex(c => c.id === id);
    if (index > -1) {
      cart[index].quantity += 1;
    }
    wx.setStorageSync('cart', cart);
    getApp().updateCartBadge();
    this.loadCart();
  },

  // 去下单
  goOrder() {
    // 检查登录。如果没有登录，先自动登录（用顾客测试账号）
    if (!isLogin()) {
      wx.showModal({
        title: '提示',
        content: '下单需要登录，使用顾客测试账号登录？',
        success: async (res) => {
          if (res.confirm) {
            try {
              const { DEV_MODE } = require('../../utils/config').CONFIG;
              if (!DEV_MODE) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
              const result = await auth.login('13800000002', '123456');
              wx.setStorageSync('token', result.data.token);
              wx.setStorageSync('userInfo', result.data.user);
              getApp().globalData.token = result.data.token;
              wx.showToast({ title: '登录成功', icon: 'success' });
              setTimeout(() => {
                wx.navigateTo({ url: '/pages/order/order' });
              }, 500);
            } catch (err) {
              wx.showToast({ title: '登录失败', icon: 'none' });
            }
          }
        },
      });
    } else {
      wx.navigateTo({ url: '/pages/order/order' });
    }
  },
});
