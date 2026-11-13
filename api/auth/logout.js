const handler = require('../../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/auth/logout')) {
    req.url = '/api/auth/logout';
  }
  return handler(req, res);
};
