/**
 * 全局配置 — 修改环境时只需改这一个文件
 */

// ========== 服务器地址 ==========
// 开发环境：localhost，生产环境：改成服务器IP或域名
export const API_BASE = '/api';          // Vite代理到后端
export const WS_URL = 'http://localhost:3000';

// ========== 订单状态映射 ==========
export const ORDER_STATUS = {
  pending:    { color: 'orange',   text: '待接单' },
  accepted:   { color: 'blue',     text: '已接单' },
  arrived:    { color: '#13c2c2',  text: '已到店' },
  delivering: { color: 'purple',   text: '配送中' },
  completed:  { color: 'green',    text: '已完成' },
  cancelled:  { color: '#999',     text: '已取消' },
};
