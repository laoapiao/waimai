# 外卖系统 - 设计文档

## 项目概述

从零开始构建一个单店外卖系统，包含三个客户端 + 一个后端服务。目标是让代码小白在实战中学会全栈开发。

## 技术栈

| 模块 | 技术选型 | 说明 |
|------|---------|------|
| 后端 | Node.js + Express | JavaScript全栈统一语言 |
| 数据库 | MySQL + Redis | 关系型数据 + 实时缓存 |
| 实时通知 | WebSocket (Socket.IO) | 订单秒级推送 |
| 商家网页 | React + Ant Design | 商品管理、订单管理、评价查看 |
| 顾客端 | 微信小程序（原生） | 浏览商品、下单、评价 |
| 手机APP | React Native（角色切换） | 商家接单 + 骑手接单配送 |

## 用户角色

| 角色 | 登录方式 | 终端 |
|------|---------|------|
| 顾客 | 微信一键登录 | 微信小程序 |
| 商家 | 手机号+短信验证码 | 网页(管理) + APP(接单) |
| 骑手 | 手机号+短信验证码 | APP(接单配送) |

## 数据库设计

### 表结构

1. **users** — 用户表（手机号、昵称、头像、角色、密码hash）
2. **categories** — 商品分类表（名称、排序）
3. **products** — 商品表（名称、价格、图片、描述、分类ID、是否上架）
4. **orders** — 订单表（顾客ID、骑手ID、状态、总金额、地址、备注）
5. **order_items** — 订单明细表（订单ID、商品ID、数量、单价）
6. **reviews** — 评价表（订单ID、评分、内容）

### 订单状态流转

```
待接单 → 已接单 → 配送中 → 已完成
                 ↘ 已取消（骑手拒单/顾客取消）
```

## 安全设计

- JWT令牌认证，接口级别角色权限校验
- bcrypt密码加密
- ORM防SQL注入
- 接口频率限制
- HTTPS加密传输
- 文件上传白名单（仅图片）

## API接口清单

### 认证：POST /api/auth/login、/register、GET /api/auth/me
### 分类：GET/POST/PUT/DELETE /api/categories
### 商品：GET/POST/PUT/DELETE /api/products
### 订单：POST/GET /api/orders、GET /api/orders/:id、PUT /api/orders/:id/status、PUT /api/orders/:id/accept
### 评价：POST/GET /api/reviews
### WebSocket事件：order:new、order:status、order:accepted

## 项目结构

```
waimaisystem/
├── server/          # 后端 Node.js + Express
├── web/             # 商家网页 React + Ant Design
├── miniapp/         # 顾客端 微信小程序
└── app/             # 手机APP React Native（商家+骑手）
```

## 开发阶段

| 阶段 | 内容 | 预计时间 |
|------|------|---------|
| 一 | 后端骨架（数据库、认证、JWT） | 3-5天 |
| 二 | 商品管理（分类、商品CRUD、图片上传） | 3-4天 |
| 三 | 订单系统（下单、状态流转、WebSocket） | 4-5天 |
| 四 | 商家网页端 | 4-5天 |
| 五 | 顾客微信小程序 | 5-7天 |
| 六 | 手机APP（React Native） | 5-7天 |

## 支付

先做模拟支付（下单即已支付），预留真支付接口。

## 部署策略

先本地开发运行，所有功能跑通后再考虑服务器部署。
