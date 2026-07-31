Page({
  data: { shopAddress: '' },
  onLoad() {
    wx.request({
      url: getApp().globalData.baseURL + '/settings',
      success: (res) => {
        if (res.data.code === 200 && res.data.data.address) {
          this.setData({ shopAddress: res.data.data.address });
        }
      },
    });
  },
  callService() { wx.makePhoneCall({ phoneNumber: '13800000000' }); },
});
