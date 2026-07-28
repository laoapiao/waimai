# 阿飘菜市 — 部署指南

## 一、买服务器

1. 阿里云/腾讯云 → 轻量应用服务器 → **2核4G** → CentOS 7 或 Ubuntu 22.04
2. 买好后拿到 **公网IP + root密码**

## 二、登录服务器装环境

```bash
ssh root@你的IP

# CentOS:
yum install -y git nodejs nginx mysql-server
# Ubuntu:
apt update && apt install -y git nodejs nginx mysql-server

# 装 PM2（进程守护）
npm install -g pm2
```

## 三、创建数据库

```bash
mysql -u root -p
CREATE DATABASE waimai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'waimai_user'@'localhost' IDENTIFIED BY '你的强密码';
GRANT ALL ON waimai.* TO 'waimai_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 四、部署代码

```bash
cd /home
git clone 你的仓库地址 waimai
# 或手动上传代码到 /home/waimai

cd /home/waimai/server
cp .env.production .env
# 编辑 .env 填入实际密码和域名
vi .env

npm install --production
pm2 start ../ecosystem.config.js
```

## 五、部署网页

```bash
cd /home/waimai/web
npm install && npm run build
# 产物在 dist/ 目录
```

## 六、配 Nginx

```bash
cp /home/waimai/deploy/nginx.conf /etc/nginx/conf.d/waimai.conf
# 把 "你的域名.com" 改成实际域名
vi /etc/nginx/conf.d/waimai.conf
nginx -t && systemctl restart nginx
```

## 七、配 HTTPS

```bash
# 用 Let's Encrypt 免费证书
yum install -y certbot
certbot --nginx -d 你的域名.com
```

## 八、小程序上线

1. 微信开发者工具 → 上传代码
2. mp.weixin.qq.com → 开发管理 → 提交审核
3. 服务器域名配置：把 `api.你的域名.com` 加到 request 合法域名

## 十、代码更新（不丢数据）

```bash
cd /home/admin/waimai
bash deploy/update.sh
```

## 十一、数据备份

```bash
# 手动备份
bash /home/admin/waimai/deploy/backup.sh

# 每天凌晨3点自动备份
(crontab -l 2>/dev/null; echo "0 3 * * * bash /home/admin/waimai/deploy/backup.sh") | crontab -
```

## 十二、备份恢复

```bash
# 恢复某个日期的备份
mysql -u waimai_user -pWaimai2024Abc waimai < /home/admin/backups/20260101/waimai.sql
cp -r /home/admin/backups/20260101/uploads/* /home/admin/waimai/server/uploads/
```

```bash
cd /home/waimai/app
npm install
npx expo build:android  # 打包 APK
# APK 下载链接发给骑手安装
```
