/**
 * 小程序全局配置
 */

// 服务器地址（上线时改成正式域名）
const CONFIG = {
  // 生产服务器地址
  baseURL: 'http://8.134.213.206:3000/api',
  wsURL: 'http://8.134.213.206:3000',
  // ⚠️ 上线前改为 false
  DEV_MODE: false,
};

// 订单状态
const ORDER_STATUS = {
  pending:    { color: '#faad14', label: '待接单' },
  accepted:   { color: '#1890ff', label: '已接单' },
  arrived:    { color: '#13c2c2', label: '已到店' },
  delivering: { color: '#722ed1', label: '配送中' },
  completed:  { color: '#52c41a', label: '已完成' },
  cancelled:  { color: '#999',    label: '已取消' },
};

module.exports = { CONFIG, ORDER_STATUS };
