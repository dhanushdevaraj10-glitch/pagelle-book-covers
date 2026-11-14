const handler = require('../server.js');

module.exports = (req, res) => {
  if (req.query && req.query.__route__) {
    const route = req.query.__route__;
    const queryEntries = Object.entries(req.query).filter(([k]) => k !== '__route__');
    if (queryEntries.length > 0) {
      const searchParams = new URLSearchParams();
      for (const [k, v] of queryEntries) {
        if (Array.isArray(v)) {
          v.forEach(val => searchParams.append(k, val));
        } else {
          searchParams.append(k, v);
        }
      }
      req.url = `${route}?${searchParams.toString()}`;
    } else {
      req.url = route;
    }
  }
  return handler(req, res);
};
