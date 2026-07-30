/**
 * 短信服务 — 支持阿里云短信 / 开发模式模拟
 *
 * 阿里云短信配置（上线时填入 .env）：
 *   SMS_ACCESS_KEY_ID=你的AccessKey
 *   SMS_ACCESS_KEY_SECRET=你的AccessKeySecret
 *   SMS_SIGN_NAME=阿飘菜市
 *   SMS_TEMPLATE_CODE=SMS_123456789
 */

const crypto = require('crypto');
const https = require('https');

// 是否启用真实短信
function isRealSMS() {
  return !!(process.env.SMS_ACCESS_KEY_ID && process.env.SMS_ACCESS_KEY_SECRET && process.env.SMS_SIGN_NAME);
}

// 阿里云短信签名
function aliyunSign(params, secret) {
  const keys = Object.keys(params).sort();
  let str = '';
  for (const k of keys) {
    str += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
  }
  str = 'GET&%2F&' + encodeURIComponent(str.slice(1));
  return crypto.createHmac('sha1', secret + '&').update(str).digest('base64');
}

// 发送真实短信（阿里云）
async function sendRealSMS(phone, code) {
  const accessKeyId = process.env.SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.SMS_ACCESS_KEY_SECRET;
  const signName = process.env.SMS_SIGN_NAME;
  const templateCode = process.env.SMS_TEMPLATE_CODE;

  const params = {
    AccessKeyId: accessKeyId,
    Action: 'SendSms',
    Format: 'JSON',
    SignatureMethod: 'HMAC-SHA1',
    SignatureVersion: '1.0',
    SignatureNonce: Date.now() + Math.random().toString(36),
    Timestamp: new Date().toISOString(),
    Version: '2017-05-25',
    PhoneNumbers: phone,
    SignName: signName,
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ code }),
  };
  params.Signature = aliyunSign(params, accessKeySecret);

  const query = Object.keys(params).sort().map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');

  return new Promise((resolve, reject) => {
    https.get('https://dysmsapi.aliyuncs.com/?' + query, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const result = JSON.parse(data);
        if (result.Code === 'OK') resolve(result);
        else reject(new Error(result.Message || '短信发送失败'));
      });
    }).on('error', reject);
  });
}

// 发送验证码（自动选择真实/模拟）
async function sendCode(phone) {
  const code = isRealSMS()
    ? String(Math.floor(100000 + Math.random() * 900000))
    : '888888';

  if (isRealSMS()) {
    await sendRealSMS(phone, code);
  }

  console.log(`📱 验证码 [${phone}]: ${code}`);
  return code;
}

module.exports = { sendCode };
