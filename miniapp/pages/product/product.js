/**
 * 商品详情页
 */

const { product } = require('../../utils/api');

Page({
  data: {
    product: {},
    quantity: 1,
  },

  onLoad(options) {
    if (options.id) {
      this.loadProduct(options.id);
    }
  },

  async loadProduct(id) {
    try {
      const res = await product.detail(id);
      this.setData({ product: res.data });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  decrease() {
    if (this.data.quantity > 1) {
      this.setData({ quantity: this.data.quantity - 1 });
    }
  },

  increase() {
    this.setData({ quantity: this.data.quantity + 1 });
  },

  // 加入购物车
  addToCart() {
    const { product: p, quantity } = this.data;
    let cart = wx.getStorageSync('cart') || [];

    const index = cart.findIndex(c => c.id === p.id);
    if (index > -1) {
      cart[index].quantity += quantity;
    } else {
      cart.push({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image,
        quantity,
      });
    }

    wx.setStorageSync('cart', cart);
    getApp().updateCartBadge();
    wx.showToast({ title: '已加入购物车', icon: 'success' });

    // 返回上一页
    setTimeout(() => wx.navigateBack(), 800);
  },
});
