/**
 * 订单列表页
 */

const { order } = require('../../utils/api');
const { isLogin } = require('../../utils/auth');
const { auth } = require('../../utils/api');

Page({
  data: {
    orders: [],
    activeStatus: '',
    tabs: [
      { label: '全部', value: '' },
      { label: '待接单', value: 'pending' },
      { label: '配送中', value: 'delivering' },
      { label: '已完成', value: 'completed' },
    ],
    statusText: {
      pending: '待接单',
      accepted: '已接单',
      delivering: '配送中',
      completed: '已完成',
      cancelled: '已取消',
    },
  },

  onShow() {
    // 确保已登录
    if (!isLogin()) {
      wx.showModal({
        title: '提示',
        content: '查看订单需要登录，使用顾客测试账号登录？',
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
              this.loadOrders();
            } catch (err) {
              wx.showToast({ title: '登录失败', icon: 'none' });
            }
          }
        },
      });
    } else {
      this.loadOrders();
    }
  },

  async loadOrders() {
    try {
      const params = {};
      if (this.data.activeStatus) {
        params.status = this.data.activeStatus;
      }
      const res = await order.list(params);
      this.setData({ orders: res.data.list || [] });
    } catch (err) {
      console.error('加载订单失败:', err);
    }
  },

  switchTab(e) {
    this.setData({ activeStatus: e.currentTarget.dataset.status }, () => {
      this.loadOrders();
    });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/order-detail/order-detail?id=' + id });
  },

  // 去评价
  goReview(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/review/review?order_id=' + id });
  },
});
