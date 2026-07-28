/**
 * 小程序全局配置
 */

// 服务器地址（上线时改成正式域名）
const CONFIG = {
  // 开发：局域网IP，生产：api.你的域名.com
  baseURL: 'http://192.168.1.24:3000/api',
  wsURL: 'http://192.168.1.24:3000',
  // ⚠️ 上线前改为 false
  DEV_MODE: true,
};

// 订单状态
const ORDER_STATUS = {
  pending:    { color: '#faad14', label: '待接单' },
  accepted:   { color: '#1890ff', label: '已接单' },
  delivering: { color: '#722ed1', label: '配送中' },
  completed:  { color: '#52c41a', label: '已完成' },
  cancelled:  { color: '#999',    label: '已取消' },
};

module.exports = { CONFIG, ORDER_STATUS };
