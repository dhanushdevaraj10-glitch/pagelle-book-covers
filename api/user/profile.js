const handler = require('../../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/user/profile')) {
    req.url = '/api/user/profile';
  }
  return handler(req, res);
};
