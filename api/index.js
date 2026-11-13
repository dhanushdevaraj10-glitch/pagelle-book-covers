const handler = require('../server.js');

module.exports = (req, res) => {
  if (req.query && req.query.__route__) {
    req.url = req.query.__route__;
  }
  return handler(req, res);
};
