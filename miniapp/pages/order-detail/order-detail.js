/**
 * 订单详情页 — 含骑手实时地图追踪（轮询方式）
 */

const { order } = require('../../utils/api');

Page({
  data: {
    order: { items: [], customer: {}, rider: null },
    statusText: {
      pending: '待接单', accepted: '已接单',
      delivering: '配送中', completed: '已完成', cancelled: '已取消',
    },
    showMap: false,
    riderLat: 39.9042,
    riderLng: 116.4074,
    riderName: '',
    markers: [],
  },

  onLoad(options) {
    if (options.id) {
      this.orderId = options.id;
      this.loadOrder(options.id);
    }
  },

  onUnload() {
    clearInterval(this.pollTimer);
    clearInterval(this.locationTimer);
  },

  async loadOrder(id) {
    try {
      const res = await order.detail(id);
      const orderData = res.data;
      this.setData({ order: orderData });

      if (['delivering'].includes(orderData.status)) {
        this.startLocationPolling(orderData);
      } else if (!['completed', 'cancelled'].includes(orderData.status)) {
        // 等骑手接单，5秒刷新一次
        this.pollTimer = setInterval(() => this.refreshOrder(), 5000);
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async refreshOrder() {
    try {
      const res = await order.detail(this.orderId);
      const orderData = res.data;
      this.setData({ order: orderData });

      if (orderData.status === 'delivering') {
        clearInterval(this.pollTimer);
        this.startLocationPolling(orderData);
      }
      if (['completed', 'cancelled'].includes(orderData.status)) {
        clearInterval(this.pollTimer);
        clearInterval(this.locationTimer);
        this.setData({ showMap: false });
      }
    } catch (e) { /* ignore */ }
  },

  // 每5秒请求一次骑手位置
  startLocationPolling(orderData) {
    this.setData({ showMap: true, riderName: orderData.rider?.nickname || '骑手' });
    this.fetchRiderLocation();

    this.locationTimer = setInterval(() => {
      this.fetchRiderLocation();
    }, 5000);
  },

  async fetchRiderLocation() {
    try {
      const res = await order.riderLocation(this.orderId);
      const loc = res.data;
      if (loc.hasRider && loc.lat) {
        this.setData({
          riderLat: loc.lat,
          riderLng: loc.lng,
          riderName: loc.riderName || this.data.riderName,
          markers: [{
            id: 1,
            latitude: loc.lat,
            longitude: loc.lng,
            width: 36, height: 36,
            iconPath: '/images/home-active.png',
            callout: {
              content: '🛵 ' + (loc.riderName || '骑手'),
              fontSize: 12, padding: 6, display: 'ALWAYS',
            },
          }],
        });
      }
    } catch (e) { /* 静默失败 */ }
  },

  goReview() {
    wx.navigateTo({ url: '/pages/review/review?order_id=' + this.data.order.id });
  },
});
