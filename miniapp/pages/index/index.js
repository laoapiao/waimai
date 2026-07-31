/**
 * 首页：左侧分类导航 + 右侧商品列表 + 锚点滚动
 */

const { product, category } = require('../../utils/api');
const { isLogin } = require('../../utils/auth');

Page({
  data: {
    categories: [],
    groupedProducts: [],
    activeCategory: 0,
    keyword: '',
    loading: true,
    announcement: '',
    scrollToId: '',
  },

  onLoad() {
    this.loadCategories();
    this.loadProducts();
    this.loadAnnouncement();
  },

  onShow() {
    this.loadProducts();
    getApp().updateCartBadge();
    const userInfo = wx.getStorageSync('userInfo') || {};
    this.setData({ userInfo });
  },

  loadAnnouncement() {
    wx.request({
      url: getApp().globalData.baseURL + '/settings',
      success: (res) => {
        if (res.data.code === 200 && res.data.data.announcement) {
          this.setData({ announcement: res.data.data.announcement });
        }
      },
    });
  },

  goMine() { wx.switchTab({ url: '/pages/mine/mine' }); },

  // 加载分类
  async loadCategories() {
    try {
      const res = await category.list();
      this.setData({ categories: res.data || [] });
    } catch (err) { console.error('加载分类失败:', err); }
  },

  // 加载商品并按分类分组
  async loadProducts() {
    this.setData({ loading: true });
    try {
      const params = { is_available: true, page_size: 200 };
      if (this.data.keyword) params.keyword = this.data.keyword;
      const res = await product.list(params);
      const products = res.data.list || [];

      // 按分类分组
      const grouped = [];
      const catMap = {};
      this.data.categories.forEach(c => {
        catMap[c.id] = { categoryId: c.id, categoryName: c.name, products: [] };
      });
      products.forEach(p => {
        const cid = p.category_id || 0;
        if (!catMap[cid]) { catMap[cid] = { categoryId: cid, categoryName: p.category?.name || '其他', products: [] }; }
        catMap[cid].products.push(p);
      });
      // 按分类排序
      Object.values(catMap).forEach(g => { if (g.products.length > 0) grouped.push(g); });

      this.setData({ groupedProducts: grouped });
    } catch (err) { console.error('加载商品失败:', err); }
    finally { this.setData({ loading: false }); }
  },

  // 左侧分类点击 → 右侧滚动到对应锚点
  switchCategory(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeCategory: id, scrollToId: 'cat-' + id });
  },

  onSearchInput(e) { this.setData({ keyword: e.detail.value }); },
  onSearch() { this.loadProducts(); },

  goDetail(e) {
    wx.navigateTo({ url: '/pages/product/product?id=' + e.currentTarget.dataset.id });
  },

  addToCart(e) {
    const item = e.currentTarget.dataset.item;
    let cart = wx.getStorageSync('cart') || [];
    const index = cart.findIndex(c => c.id === item.id);
    if (index > -1) { cart[index].quantity += 1; }
    else { cart.push({ id: item.id, name: item.name, price: item.price, image: item.image, quantity: 1 }); }
    wx.setStorageSync('cart', cart);
    getApp().updateCartBadge();
    wx.showToast({ title: '已加入购物车', icon: 'success' });
  },
});
