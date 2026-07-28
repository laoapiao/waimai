/**
 * 首页：商品浏览
 */

const { product, category } = require('../../utils/api');
const { isLogin } = require('../../utils/auth');

Page({
  data: {
    categories: [],
    products: [],
    activeCategory: 0,
    keyword: '',
    loading: true,
  },

  onLoad() {
    this.loadCategories();
    this.loadProducts();
  },

  onShow() {
    this.loadProducts();
    // 加载用户信息显示头像
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ userInfo });
  },

  goMine() {
    wx.switchTab({ url: '/pages/mine/mine' });
  },

  // 下拉刷新
  onPullDownRefresh() {
    Promise.all([this.loadCategories(), this.loadProducts()]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载分类
  async loadCategories() {
    try {
      const res = await category.list();
      this.setData({ categories: res.data || [] });
    } catch (err) {
      console.error('加载分类失败:', err);
    }
  },

  // 加载商品
  async loadProducts() {
    this.setData({ loading: true });
    try {
      const params = { is_available: true };
      if (this.data.activeCategory !== 0) {
        params.category_id = this.data.activeCategory;
      }
      if (this.data.keyword) {
        params.keyword = this.data.keyword;
      }
      const res = await product.list(params);
      this.setData({ products: res.data.list || [] });
    } catch (err) {
      console.error('加载商品失败:', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  // 切换分类
  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCategory: id }, () => {
      this.loadProducts();
    });
  },

  // 搜索
  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    this.loadProducts();
  },

  // 跳转商品详情
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/product/product?id=' + id });
  },

  // 加入购物车
  addToCart(e) {
    const item = e.currentTarget.dataset.item;
    let cart = wx.getStorageSync('cart') || [];

    // 检查是否已在购物车中
    const index = cart.findIndex(c => c.id === item.id);
    if (index > -1) {
      cart[index].quantity += 1;
    } else {
      cart.push({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
      });
    }

    wx.setStorageSync('cart', cart);
    getApp().updateCartBadge();
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },
});
