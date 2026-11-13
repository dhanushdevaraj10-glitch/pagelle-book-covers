const handler = require('../../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/auth/change-password')) {
    req.url = '/api/auth/change-password';
  }
  return handler(req, res);
};
