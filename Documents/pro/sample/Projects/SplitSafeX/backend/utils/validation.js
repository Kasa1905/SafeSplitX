const { isMongoId } = require('validator');
const { validate: isUuid } = require('uuid');

const isValidId = (value) => isMongoId(value) || isUuid(value);

module.exports = { isValidId };