/**
 * 评价页面
 */

const { review } = require('../../utils/api');

Page({
  data: {
    orderId: '',
    rating: 5,
    content: '',
    submitting: false,
  },

  onLoad(options) {
    if (options.order_id) {
      this.setData({ orderId: options.order_id });
    }
  },

  setRating(e) {
    this.setData({ rating: e.currentTarget.dataset.rating });
  },

  onContentInput(e) {
    this.setData({ content: e.detail.value });
  },

  async submitReview() {
    if (this.data.rating === 0) {
      return wx.showToast({ title: '请评分', icon: 'none' });
    }

    this.setData({ submitting: true });

    try {
      await review.create({
        order_id: parseInt(this.data.orderId),
        rating: this.data.rating,
        content: this.data.content || '',
      });

      wx.showToast({ title: '评价成功！', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (err) {
      // 409 = 已经评价过
      if (err.message && err.message.includes('已经评价')) {
        wx.showToast({ title: '该订单已评价过', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1000);
      } else {
        wx.showToast({ title: err.message || '评价失败', icon: 'none' });
      }
    } finally {
      this.setData({ submitting: false });
    }
  },
});
