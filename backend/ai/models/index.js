// AI Models Index - Exports all fraud detection related models
const FraudAnalysis = require('./FraudAnalysis');
const FraudAlert = require('./FraudAlert');
const FraudRule = require('./FraudRule');

// Create models object with all available models
const models = {
  FraudAnalysis,
  FraudAlert,
  FraudRule,
  // Add database models if available
  User: null, // Will be set when database connection is established
  Expense: null, // Will be set when database connection is established
  Group: null // Will be set when database connection is established
};

// Function to get models (singleton pattern)
function getModels() {
  return models;
}

// Function to update database models when connection is established
function setDatabaseModels(dbModels) {
  if (dbModels.User) models.User = dbModels.User;
  if (dbModels.Expense) models.Expense = dbModels.Expense;
  if (dbModels.Group) models.Group = dbModels.Group;
}

module.exports = {
  FraudAnalysis,
  FraudAlert,
  FraudRule,
  getModels,
  setDatabaseModels,
  models
};