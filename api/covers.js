const handler = require('../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/covers')) {
    req.url = '/api/covers' + (req.url && req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
  }
  return handler(req, res);
};
