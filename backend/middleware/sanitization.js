const xssClean = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

const sanitizationMiddleware = [
  mongoSanitize({ replaceWith: '_' }),
  xssClean()
];

module.exports = { sanitizationMiddleware };