Page({
  data: { content: '', contact: '', submitting: false },
  onInput(e) { this.setData({ content: e.detail.value }); },
  onContact(e) { this.setData({ contact: e.detail.value }); },
  async submit() {
    if (!this.data.content.trim()) return wx.showToast({ title: '请输入反馈内容', icon: 'none' });
    this.setData({ submitting: true });
    try {
      const token = wx.getStorageSync('token');
      await new Promise((resolve, reject) => {
        wx.request({
          url: getApp().globalData.baseURL + '/feedback', method: 'POST',
          header: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
          data: { content: this.data.content, contact: this.data.contact },
          success: r => r.data.code === 200 ? resolve() : reject(r.data),
          fail: reject,
        });
      });
      wx.showToast({ title: '感谢反馈！', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1000);
    } catch (e) { wx.showToast({ title: '提交失败', icon: 'none' }); }
    finally { this.setData({ submitting: false }); }
  },
});
