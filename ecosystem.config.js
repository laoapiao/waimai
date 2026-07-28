/**
 * PM2 进程管理配置
 * 服务器上运行: pm2 start ecosystem.config.js
 */

module.exports = {
  apps: [{
    name: 'waimai-api',
    script: 'server/src/app.js',
    cwd: __dirname,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
