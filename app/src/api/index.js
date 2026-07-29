/**
 * API 请求 + WebSocket 连接
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

import { API_BASE, WS_URL } from '../config';

// ========== HTTP 请求封装 ==========
async function request(url, options = {}) {
  const token = await AsyncStorage.getItem('token');

  const config = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers,
    },
  };

  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  const response = await fetch(API_BASE + url, config);
  const result = await response.json();

  if (result.code === 200) {
    return result;
  } else {
    throw result;
  }
}

// ========== API 函数 ==========
export const authAPI = {
  login: (phone, password) => request('/auth/login', { method: 'POST', data: { phone, password } }),
  getMe: () => request('/auth/me'),
  updateProfile: (data) => request('/auth/me', { method: 'PUT', data }),
};

export const orderAPI = {
  list: (params) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return request('/orders' + query);
  },
  detail: (id) => request('/orders/' + id),
  updateStatus: (id, status) => request('/orders/' + id + '/status', { method: 'PUT', data: { status } }),
  accept: (id) => request('/orders/' + id + '/accept', { method: 'PUT' }),
};

// ========== WebSocket 连接 ==========
let socket = null;
let socketListeners = [];

export function connectSocket(token) {
  if (socket) {
    socket.disconnect();
  }

  socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('🔗 WebSocket 已连接');
  });

  socket.on('disconnect', () => {
    console.log('🔌 WebSocket 断开');
  });

  // 重新绑定之前注册的监听器
  socketListeners.forEach(({ event, handler }) => {
    socket.on(event, handler);
  });

  return socket;
}

export function onSocketEvent(event, handler) {
  socketListeners.push({ event, handler });
  if (socket) {
    socket.on(event, handler);
  }
  // 返回取消监听函数
  return () => {
    socketListeners = socketListeners.filter(l => l.handler !== handler);
    if (socket) {
      socket.off(event, handler);
    }
  };
}

// 发送 WebSocket 事件（用于骑手上报位置等）
export function emitSocketEvent(event, data) {
  if (socket && socket.connected) {
    socket.emit(event, data);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketListeners = [];
}
