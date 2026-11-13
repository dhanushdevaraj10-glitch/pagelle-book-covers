const handler = require('../../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/admin/overview')) {
    req.url = '/api/admin/overview';
  }
  return handler(req, res);
};
