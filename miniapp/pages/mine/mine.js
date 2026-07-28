/**
 * 我的 — 个人中心
 */

const { isLogin } = require('../../utils/auth');
const { auth, order } = require('../../utils/api');

Page({
  data: {
    userInfo: {},
    roleText: '',
    stats: { all: 0, pending: 0, delivering: 0, completed: 0 },
    addressCount: 0,
  },

  onShow() {
    this.loadUser();
    this.loadStats();
    this.loadAddressCount();
  },

  loadUser() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const roleMap = { customer: '顾客', merchant: '商家', rider: '骑手' };
    this.setData({
      userInfo,
      roleText: roleMap[userInfo.role] || '未登录',
    });
  },

  async loadStats() {
    if (!isLogin()) return;
    try {
      const res = await order.list({ page_size: 100 });
      const orders = res.data.list || [];
      this.setData({
        stats: {
          all: orders.length,
          pending: orders.filter(o => o.status === 'pending').length,
          delivering: orders.filter(o => o.status === 'delivering').length,
          completed: orders.filter(o => o.status === 'completed').length,
        },
      });
    } catch (e) { /* ignore */ }
  },

  loadAddressCount() {
    const addresses = wx.getStorageSync('addresses') || [];
    this.setData({ addressCount: addresses.length });
  },

  // 微信头像选择（open-type="chooseAvatar" 回调）
  onChooseAvatar(e) {
    const avatarUrl = e.detail?.avatarUrl;
    if (!avatarUrl || avatarUrl === 'cancel') return;
    wx.showLoading({ title: '同步中...' });

    // 直接用微信头像 URL 更新资料
    wx.request({
      url: getApp().globalData.baseURL + '/auth/me',
      method: 'PUT',
      header: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + wx.getStorageSync('token') },
      data: { avatar: avatarUrl },
      success: (res) => {
        wx.hideLoading();
        if (res.data.code === 200 && res.data.data) {
          wx.setStorageSync('userInfo', res.data.data);
          getApp().globalData.userInfo = res.data.data;
          this.loadUser();
          wx.showToast({ title: '头像已同步', icon: 'success' });
        } else {
          wx.showToast({ title: '同步失败', icon: 'none' });
        }
      },
      fail: () => { wx.hideLoading(); wx.showToast({ title: '网络错误', icon: 'none' }); },
    });
  },

  // 更换头像（备用：相册/拍照）
  changeAvatar() {
    wx.chooseImage({
      count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'],
      success: (res) => {
        wx.showLoading({ title: '上传中...' });
        wx.uploadFile({
          url: getApp().globalData.baseURL + '/auth/me',
          filePath: res.tempFilePaths[0], name: 'avatar',
          header: { Authorization: 'Bearer ' + wx.getStorageSync('token') },
          success: (uploadRes) => {
            const data = JSON.parse(uploadRes.data);
            if (data.code === 200 && data.data) {
              wx.setStorageSync('userInfo', data.data);
              getApp().globalData.userInfo = data.data;
              this.loadUser();
              wx.showToast({ title: '头像已更新', icon: 'success' });
            }
          },
          fail: () => wx.showToast({ title: '上传失败', icon: 'none' }),
        });
      },
    });
  },

  // 跳转订单列表（带状态筛选）
  goOrders(e) {
    const status = e.currentTarget.dataset.status;
    wx.switchTab({ url: '/pages/orders/orders' });
    // 通过 globalData 传递筛选状态
    getApp().globalData.orderStatusFilter = status;
  },

  // 收货地址管理
  goAddress() {
    wx.navigateTo({ url: '/pages/address/address' });
  },

  // 我的评价
  goReviews() {
    wx.switchTab({ url: '/pages/orders/orders' });
  },

  // 意见反馈
  goFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },

  // 关于菜市
  goAbout() {
    wx.navigateTo({ url: '/pages/about/about' });
  },

  // 联系客服
  contactService() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：138-0000-0000\n工作时间：9:00-21:00',
      confirmText: '拨打',
      success(res) {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber: '13800000000' });
        }
      },
    });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '将清除本地购物车和缓存数据',
      success(res) {
        if (res.confirm) {
          wx.removeStorageSync('cart');
          wx.removeStorageSync('addresses');
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  },
});
