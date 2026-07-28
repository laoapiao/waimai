/**
 * 确认下单页面（含地图选地址）
 */

Page({
  data: {
    cart: [],
    totalPrice: '0.00',
    contactPhone: '',
    address: '',
    remark: '',
    lat: null,
    lng: null,
    submitting: false,
  },

  onLoad() {
    const cart = wx.getStorageSync('cart') || [];
    if (cart.length === 0) {
      wx.showToast({ title: '购物车为空', icon: 'none' });
      setTimeout(() => wx.navigateBack(), 1000);
      return;
    }
    const totalPrice = cart
      .reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0)
      .toFixed(2);

    const userInfo = wx.getStorageSync('userInfo') || {};

    this.setData({
      cart,
      totalPrice,
      contactPhone: userInfo.phone || '',
    });
  },

  onPhoneInput(e) { this.setData({ contactPhone: e.detail.value }); },
  onAddressInput(e) { this.setData({ address: e.detail.value }); },
  onRemarkInput(e) { this.setData({ remark: e.detail.value }); },

  // 微信地图选地址
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        if (res.address) {
          this.setData({
            address: res.address + (res.name ? ' ' + res.name : ''),
            lat: res.latitude,
            lng: res.longitude,
          });
        }
      },
      fail: () => {
        wx.showToast({ title: '需要位置权限', icon: 'none' });
      },
    });
  },

  // 提交订单 → 跳支付页
  submitOrder() {
    const { cart, contactPhone, address, remark, lat, lng } = this.data;

    if (!contactPhone || !/^1\d{10}$/.test(contactPhone)) {
      return wx.showToast({ title: '请输入正确的手机号', icon: 'none' });
    }
    if (!address.trim()) {
      return wx.showToast({ title: '请输入配送地址', icon: 'none' });
    }

    const params = [
      'phone=' + encodeURIComponent(contactPhone),
      'address=' + encodeURIComponent(address.trim()),
      'remark=' + encodeURIComponent(remark || ''),
      'lat=' + (lat || ''),
      'lng=' + (lng || ''),
    ].join('&');

    wx.navigateTo({ url: '/pages/pay/pay?' + params });
  },
});
