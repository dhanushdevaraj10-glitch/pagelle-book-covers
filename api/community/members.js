const handler = require('../../server.js');

module.exports = (req, res) => {
  if (!req.url || req.url === '/' || !req.url.startsWith('/api/community/members')) {
    req.url = '/api/community/members';
  }
  return handler(req, res);
};
