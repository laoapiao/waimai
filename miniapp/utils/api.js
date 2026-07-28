/**
 * API 请求封装
 */

const app = getApp();

// 发起请求
function request(url, options = {}) {
  const token = wx.getStorageSync('token');

  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.baseURL + url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...options.header,
      },
      timeout: options.timeout || 10000,
      success(res) {
        if (res.data.code === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token过期，清除登录状态
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          reject(res.data);
        } else {
          reject(res.data);
        }
      },
      fail(err) {
        reject({ message: '网络请求失败，请检查网络' });
      },
    });
  });
}

// ========== API 函数 ==========

// 商品
const product = {
  list: (params) => request('/products', { data: params }),
  detail: (id) => request('/products/' + id),
};

// 分类
const category = {
  list: () => request('/categories'),
};

// 订单
const order = {
  create: (data) => request('/orders', { method: 'POST', data }),
  list: (params) => request('/orders', { data: params }),
  detail: (id) => request('/orders/' + id),
  accept: (id) => request('/orders/' + id + '/accept', { method: 'PUT' }),
  updateStatus: (id, status) => request('/orders/' + id + '/status', { method: 'PUT', data: { status } }),
  riderLocation: (id) => request('/orders/' + id + '/location'),
};

// 评价
const review = {
  create: (data) => request('/reviews', { method: 'POST', data }),
};

// 认证（模拟登录，实际应该用微信登录）
const auth = {
  login: (phone, password) => request('/auth/login', { method: 'POST', data: { phone, password } }),
  register: (data) => request('/auth/register', { method: 'POST', data }),
};

module.exports = { product, category, order, review, auth };
