const handler = require('../../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/auth/login')) {
    req.url = '/api/auth/login' + (req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  }
  return handler(req, res);
};
