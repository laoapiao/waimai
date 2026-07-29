/**
 * APP全局配置 — 换环境只需改这一个文件
 */

// 开发：局域网IP，生产：api.你的域名.com
// 开发环境 = 本地IP，生产环境 = 服务器IP
export const API_BASE = 'http://8.134.213.206/api';
export const WS_URL = 'http://8.134.213.206:3000';

// 订单状态
export const ORDER_STATUS = {
  pending:    { label: '待接单', color: '#faad14' },
  accepted:   { label: '已接单', color: '#1890ff' },
  arrived:    { label: '已到店', color: '#13c2c2' },
  delivering: { label: '配送中', color: '#722ed1' },
  completed:  { label: '已完成', color: '#52c41a' },
  cancelled:  { label: '已取消', color: '#999' },
};
