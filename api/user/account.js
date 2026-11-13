const handler = require('../../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/user/account')) {
    req.url = '/api/user/account';
  }
  return handler(req, res);
};
