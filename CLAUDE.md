# 阿飘菜市 — 项目总览

> 这是一个完整的外卖/菜市场配送系统，由 Claude Code 协助从零搭建。用户是编程新手。

## 项目结构
```
waimaisystem/
├── server/          # 后端 Node.js + Express + MySQL + Socket.IO
├── web/             # 商家网页 React + Ant Design + Vite
├── miniapp/         # 顾客微信小程序
├── app/             # 骑手APP React Native / Expo
├── deploy/          # 部署脚本（update.sh, backup.sh, nginx.conf）
├── DEPLOY.md        # 部署指南
└── CLAUDE.md        # 本文件 — 项目记忆
```

## 技术栈
- **后端**: Node.js 20 + Express 4 + Sequelize + MySQL 8 + Socket.IO + JWT
- **网页**: React 18 + Ant Design 5 + Vite + Recharts
- **小程序**: 微信原生开发
- **APP**: Expo SDK 57 + React Native

## 关键账号
| 角色 | 手机号 | 密码 | 用途 |
|------|--------|------|------|
| 商家 | 19047120644 | abc10086 | 网页端 + APP 商家模式 |
| 顾客 | 13800000002 | 123456 | 微信小程序（DEV_MODE自动登录） |
| 骑手 | 19047120645 | 123456 | APP 骑手模式 |

## 服务器
- **IP**: 8.134.213.206
- **系统**: Ubuntu 22.04 (阿里云轻量服务器)
- **代码路径**: /home/admin/waimai
- **进程管理**: PM2 (waimai-api)
- **网页访问**: http://8.134.213.206

## 订单状态流转
pending → accepted → arrived → delivering → completed
                    ↘ cancelled

## 关键配置
- **DEV_MODE**: miniapp/utils/config.js 里的开关，true=开发模式自动登录
- **环境变量**: server/.env (DB_HOST, JWT_SECRET, FILE_BASE_URL, CORS_ORIGIN)
- **微信配置**: WX_APPID=wx83dd6914e30e938f, WX_SECRET待填

## 当前状态
- ✅ 后端 + 网页 + 小程序 + APP 全部开发完成
- ✅ 微信登录框架就绪（开发模式用手机号，生产模式用 wx.login）
- ✅ 微信支付框架就绪（开发模式模拟，生产模式 wx.requestPayment）
- ⏳ 域名备案审核中（备案通过后配 HTTPS + 提交小程序审核）
- ⏳ 骑手 APP 待打包 APK（eas build -p android）

## 常用命令
```bash
# 本地开发
cd server && npm run dev       # 后端
cd web && npm run dev          # 网页
cd app && npx expo start       # APP（Expo Go 扫码）

# 服务器安全更新（不丢数据）
bash /home/admin/waimai/deploy/update.sh

# 服务器备份
bash /home/admin/waimai/deploy/backup.sh
```

## 用户偏好
- 用户是编程新手，需要每一步详细解释
- 需要先确认方案再执行
- 项目从外卖改成菜市场（阿飘菜市），主营蔬菜水果肉类海鲜
- 安全第一，数据不能丢
