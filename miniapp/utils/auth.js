/**
 * 微信登录 + 后端认证
 *
 * 流程：
 * 1. wx.login() 获取临时code
 * 2. 发送code到后端，后端用code换取openid
 * 3. 后端返回JWT token
 *
 * 当前阶段用手机号模拟登录（因为微信小程序需要审核通过才能用微信登录）
 */

const { auth } = require('./api');

// 模拟微信登录：用手机号
async function mockLogin(phone, password) {
  const res = await auth.login(phone, password);

  // 保存登录状态
  wx.setStorageSync('token', res.data.token);
  wx.setStorageSync('userInfo', res.data.user);
  getApp().globalData.token = res.data.token;
  getApp().globalData.userInfo = res.data.user;

  return res.data.user;
}

// 微信一键登录（未来对接微信开放能力时使用）
async function wxLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (res.code) {
          // TODO: 发送code到后端换取token
          // const result = await auth.wxLogin(res.code);
          resolve(res);
        } else {
          reject(new Error('微信登录失败'));
        }
      },
      fail: reject,
    });
  });
}

// 检查是否已登录
function isLogin() {
  return !!wx.getStorageSync('token');
}

// 退出登录
function logout() {
  wx.removeStorageSync('token');
  wx.removeStorageSync('userInfo');
  getApp().globalData.token = '';
  getApp().globalData.userInfo = {};
}

module.exports = { mockLogin, wxLogin, isLogin, logout };
