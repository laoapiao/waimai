/**
 * 外卖小程序 - 应用入口
 */

const { CONFIG } = require('./utils/config');

App({
  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.globalData.userInfo = wx.getStorageSync('userInfo') || {};
    }
    this.updateCartBadge();
  },

  onShow() {
    this.updateCartBadge();
  },

  updateCartBadge() {
    const cart = wx.getStorageSync('cart') || [];
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (count > 0) {
      wx.setTabBarBadge({ index: 1, text: String(count) });
    } else {
      wx.removeTabBarBadge({ index: 1 });
    }
  },

  globalData: {
    token: '',
    userInfo: {},
    baseURL: CONFIG.baseURL,
    wsURL: CONFIG.wsURL,
  },
});
