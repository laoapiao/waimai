/**
 * API 请求封装
 * 所有和后端的通信都通过这里
 */

import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',  // Vite 代理到 localhost:3000
  timeout: 10000,
});

// ========== 请求拦截器：自动带 token ==========
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== 响应拦截器：统一处理错误 ==========
api.interceptors.response.use(
  (response) => response.data,  // 直接返回 data
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // 401 = token过期或没登录 → 跳转到登录页
      if (status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      return Promise.reject(data || { message: '请求失败' });
    }
    return Promise.reject({ message: '网络错误，请检查后端服务是否启动' });
  }
);

// ========== API 函数 ==========

// --- 认证 ---
export const authAPI = {
  login: (phone, password) => api.post('/auth/login', { phone, password }),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
};

// --- 分类 ---
export const categoryAPI = {
  list: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
};

// --- 商品 ---
export const productAPI = {
  list: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (formData) => api.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  // 有图片用 multipart，没图片用 JSON（防止 multer 丢失其他字段）
  update: (id, data) => {
    if (data instanceof FormData) {
      return api.put(`/products/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return api.put(`/products/${id}`, data);
  },
  remove: (id) => api.delete(`/products/${id}`),
};

// --- 订单 ---
export const orderAPI = {
  list: (params) => api.get('/orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
};

// --- 评价 ---
export const reviewAPI = {
  list: (params) => api.get('/reviews', { params }),
};

export default api;
