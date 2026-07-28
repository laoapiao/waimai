/**
 * 微信登录 + 后端认证
 */

const { auth } = require('./api');

// 开发模式：用手机号登录
async function mockLogin(phone, password) {
  const res = await auth.login(phone, password);
  wx.setStorageSync('token', res.data.token);
  wx.setStorageSync('userInfo', res.data.user);
  getApp().globalData.token = res.data.token;
  getApp().globalData.userInfo = res.data.user;
  return res.data.user;
}

// 真正的微信一键登录
async function wxLogin(nickname, avatar) {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async (res) => {
        if (!res.code) return reject(new Error('wx.login failed'));
        try {
          const result = await auth.wechatLogin(res.code, nickname, avatar);
          wx.setStorageSync('token', result.data.token);
          wx.setStorageSync('userInfo', result.data.user);
          getApp().globalData.token = result.data.token;
          getApp().globalData.userInfo = result.data.user;
          resolve(result.data.user);
        } catch (err) {
          reject(err);
        }
      },
      fail: reject,
    });
  });
}

// 智能登录：开发模式用手机号，生产模式用微信
async function smartLogin() {
  const { DEV_MODE } = require('./config').CONFIG;
  if (DEV_MODE) {
    return mockLogin('13800000002', '123456');
  }
  // 生产模式：wx.login + getNickname/getAvatar
  const userInfo = wx.getStorageSync('userInfo') || {};
  return wxLogin(userInfo.nickname, userInfo.avatar);
}

function isLogin() {
  return !!wx.getStorageSync('token');
}

function logout() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  getApp().globalData.token = '';
  getApp().globalData.userInfo = {};
}

module.exports = { mockLogin, wxLogin, smartLogin, isLogin, logout };
