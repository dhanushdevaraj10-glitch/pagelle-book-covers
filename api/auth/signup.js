const handler = require('../../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/auth/signup')) {
    req.url = '/api/auth/signup' + (req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  }
  return handler(req, res);
};
