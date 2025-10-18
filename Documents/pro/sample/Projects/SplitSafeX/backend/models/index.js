/**
 * Models Index for SafeSplitX
 * Unified model export system with database detection and initialization
 */

const mongoose = require('mongoose');
const { Sequelize } = require('sequelize');

// Import MongoDB models
const { MongoUser } = require('./User');
const { MongoGroup } = require('./Group');
const { MongoExpense } = require('./Expense');
const { MongoSettlement } = require('./Settlement');

// Import PostgreSQL model creators
const { createPostgresUserModel } = require('./User');
const { 
  createPostgresGroupModel, 
  createPostgresGroupMemberModel 
} = require('./Group');
const { 
  createPostgresExpenseModel, 
  createPostgresExpenseSplitModel 
} = require('./Expense');
const { 
  createPostgresSettlementModel, 
  createPostgresSettlementExpenseModel 
} = require('./Settlement');

// Database type detection
const DB_TYPE = process.env.DB_TYPE || 'mongodb';

let models = {};

/**
 * Initialize MongoDB models
 */
const initializeMongoModels = () => {
  models = {
    User: MongoUser,
    Group: MongoGroup,
    Expense: MongoExpense,
    Settlement: MongoSettlement
  };

  console.log('MongoDB models initialized');
  return models;
};

/**
 * Initialize PostgreSQL models
 */
const initializePostgresModels = (sequelize) => {
  if (!sequelize) {
    throw new Error('Sequelize instance is required for PostgreSQL models');
  }

  // Create models
  const User = createPostgresUserModel(sequelize);
  const Group = createPostgresGroupModel(sequelize);
  const GroupMember = createPostgresGroupMemberModel(sequelize);
  const Expense = createPostgresExpenseModel(sequelize);
  const ExpenseSplit = createPostgresExpenseSplitModel(sequelize);
  const Settlement = createPostgresSettlementModel(sequelize);
  const SettlementExpense = createPostgresSettlementExpenseModel(sequelize);

  // Define associations
  definePostgresAssociations({
    User,
    Group,
    GroupMember,
    Expense,
    ExpenseSplit,
    Settlement,
    SettlementExpense
  });

  models = {
    User,
    Group,
    GroupMember,
    Expense,
    ExpenseSplit,
    Settlement,
    SettlementExpense
  };

  console.log('PostgreSQL models initialized');
  return models;
};

/**
 * Define PostgreSQL model associations
 */
const definePostgresAssociations = ({
  User,
  Group,
  GroupMember,
  Expense,
  ExpenseSplit,
  Settlement,
  SettlementExpense
}) => {
  // User associations
  User.hasMany(Group, { 
    foreignKey: 'createdBy', 
    as: 'createdGroups' 
  });
  User.hasMany(GroupMember, { 
    foreignKey: 'userId', 
    as: 'groupMemberships' 
  });
  User.hasMany(Expense, { 
    foreignKey: 'paidBy', 
    as: 'paidExpenses' 
  });
  User.hasMany(ExpenseSplit, { 
    foreignKey: 'userId', 
    as: 'expenseSplits' 
  });
  User.hasMany(Settlement, { 
    foreignKey: 'fromUserId', 
    as: 'outgoingSettlements' 
  });
  User.hasMany(Settlement, { 
    foreignKey: 'toUserId', 
    as: 'incomingSettlements' 
  });

  // Group associations
  Group.belongsTo(User, { 
    foreignKey: 'createdBy', 
    as: 'creator' 
  });
  Group.hasMany(GroupMember, { 
    foreignKey: 'groupId', 
    as: 'members' 
  });
  Group.hasMany(Expense, { 
    foreignKey: 'groupId', 
    as: 'expenses' 
  });
  Group.hasMany(Settlement, { 
    foreignKey: 'groupId', 
    as: 'settlements' 
  });

  // GroupMember associations
  GroupMember.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });
  GroupMember.belongsTo(Group, { 
    foreignKey: 'groupId', 
    as: 'group' 
  });

  // Expense associations
  Expense.belongsTo(User, { 
    foreignKey: 'paidBy', 
    as: 'payer' 
  });
  Expense.belongsTo(Group, { 
    foreignKey: 'groupId', 
    as: 'group' 
  });
  Expense.hasMany(ExpenseSplit, { 
    foreignKey: 'expenseId', 
    as: 'splits' 
  });
  Expense.hasMany(SettlementExpense, { 
    foreignKey: 'expenseId', 
    as: 'settlementExpenses' 
  });

  // ExpenseSplit associations
  ExpenseSplit.belongsTo(Expense, { 
    foreignKey: 'expenseId', 
    as: 'expense' 
  });
  ExpenseSplit.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });

  // Settlement associations
  Settlement.belongsTo(User, { 
    foreignKey: 'fromUserId', 
    as: 'fromUser' 
  });
  Settlement.belongsTo(User, { 
    foreignKey: 'toUserId', 
    as: 'toUser' 
  });
  Settlement.belongsTo(Group, { 
    foreignKey: 'groupId', 
    as: 'group' 
  });
  Settlement.hasMany(SettlementExpense, { 
    foreignKey: 'settlementId', 
    as: 'settlementExpenses' 
  });

  // SettlementExpense associations
  SettlementExpense.belongsTo(Settlement, { 
    foreignKey: 'settlementId', 
    as: 'settlement' 
  });
  SettlementExpense.belongsTo(Expense, { 
    foreignKey: 'expenseId', 
    as: 'expense' 
  });

  // Many-to-many associations through junction tables
  User.belongsToMany(Group, { 
    through: GroupMember, 
    foreignKey: 'userId',
    otherKey: 'groupId',
    as: 'groups' 
  });
  Group.belongsToMany(User, { 
    through: GroupMember, 
    foreignKey: 'groupId',
    otherKey: 'userId',
    as: 'users' 
  });

  Settlement.belongsToMany(Expense, { 
    through: SettlementExpense, 
    foreignKey: 'settlementId',
    otherKey: 'expenseId',
    as: 'expenses' 
  });
  Expense.belongsToMany(Settlement, { 
    through: SettlementExpense, 
    foreignKey: 'expenseId',
    otherKey: 'settlementId',
    as: 'settlements' 
  });
};

/**
 * Initialize models based on database type
 */
const initializeModels = (sequelize = null) => {
  try {
    if (DB_TYPE.toLowerCase() === 'postgresql' || DB_TYPE.toLowerCase() === 'postgres') {
      return initializePostgresModels(sequelize);
    } else {
      return initializeMongoModels();
    }
  } catch (error) {
    console.error('Error initializing models:', error);
    throw error;
  }
};

/**
 * Get all models
 */
const getModels = () => {
  if (Object.keys(models).length === 0) {
    throw new Error('Models not initialized. Call initializeModels() first.');
  }
  return models;
};

/**
 * Check if models are initialized
 */
const areModelsInitialized = () => {
  return Object.keys(models).length > 0;
};

/**
 * Get database type
 */
const getDatabaseType = () => {
  return DB_TYPE.toLowerCase();
};

/**
 * Sync database (PostgreSQL only)
 */
const syncDatabase = async (options = {}) => {
  if (getDatabaseType() === 'postgresql' || getDatabaseType() === 'postgres') {
    const sequelize = options.sequelize;
    if (!sequelize) {
      throw new Error('Sequelize instance required for database sync');
    }
    
    try {
      await sequelize.sync(options);
      console.log('Database synchronized successfully');
    } catch (error) {
      console.error('Database sync failed:', error);
      throw error;
    }
  } else {
    console.log('Database sync not required for MongoDB');
  }
};

module.exports = {
  initializeModels,
  getModels,
  areModelsInitialized,
  getDatabaseType,
  syncDatabase,
  
  // Direct model exports for specific use cases
  MongoUser,
  MongoGroup,
  MongoExpense,
  MongoSettlement,
  
  // Model creators for PostgreSQL
  createPostgresUserModel,
  createPostgresGroupModel,
  createPostgresGroupMemberModel,
  createPostgresExpenseModel,
  createPostgresExpenseSplitModel,
  createPostgresSettlementModel,
  createPostgresSettlementExpenseModel
};