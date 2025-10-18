const { v4: uuidv4 } = require('uuid');

const generateRequestId = (req, res, next) => {
  req.requestId = req.requestId || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

module.exports = { generateRequestId };