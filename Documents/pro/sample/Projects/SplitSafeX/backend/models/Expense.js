/**
 * Expense Model for SafeSplitX
 * Supports both MongoDB (Mongoose) and PostgreSQL (Sequelize)
 */

const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

// Split methods
const SPLIT_METHODS = ['equal', 'weighted', 'percentage', 'custom'];

// Expense categories
const EXPENSE_CATEGORIES = [
  'food', 'transportation', 'accommodation', 'entertainment', 'shopping', 
  'utilities', 'healthcare', 'education', 'travel', 'other'
];

// MongoDB Schema using Mongoose
const mongoExpenseSchema = new mongoose.Schema({
  description: {
    type: String,
    required: [true, 'Expense description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    enum: {
      values: SUPPORTED_CURRENCIES,
      message: 'Currency {VALUE} is not supported'
    }
  },
  category: {
    type: String,
    enum: EXPENSE_CATEGORIES,
    default: 'other'
  },
  date: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now,
    validate: {
      validator: function(date) {
        return date <= new Date();
      },
      message: 'Expense date cannot be in the future'
    }
  },
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer is required']
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required']
  },
  splitMethod: {
    type: String,
    enum: SPLIT_METHODS,
    default: 'equal'
  },
  splits: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    },
    weight: {
      type: Number,
      min: 0,
      default: 1
    },
    isPaid: {
      type: Boolean,
      default: false
    }
  }],
  receipt: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    mimeType: String,
    uploadedAt: Date
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  fraudScore: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    reasons: [String],
    analyzedAt: Date,
    isReviewed: {
      type: Boolean,
      default: false
    }
  },
  exchangeRate: {
    from: String,
    to: String,
    rate: Number,
    date: Date
  },
  isApproved: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for MongoDB
mongoExpenseSchema.index({ groupId: 1, date: -1 });
mongoExpenseSchema.index({ paidBy: 1 });
mongoExpenseSchema.index({ 'splits.userId': 1 });
mongoExpenseSchema.index({ category: 1 });
mongoExpenseSchema.index({ isDeleted: 1 });
mongoExpenseSchema.index({ 'fraudScore.score': -1 });

// Virtual for total split amount
mongoExpenseSchema.virtual('totalSplitAmount').get(function() {
  return this.splits.reduce((total, split) => total + split.amount, 0);
});

// Method to validate splits
mongoExpenseSchema.methods.validateSplits = function() {
  const totalSplit = this.totalSplitAmount;
  const tolerance = 0.01; // Allow 1 cent difference due to rounding
  
  if (Math.abs(totalSplit - this.amount) > tolerance) {
    throw new Error('Split amounts do not match expense total');
  }
  
  if (this.splitMethod === 'percentage') {
    const totalPercentage = this.splits.reduce((total, split) => total + (split.percentage || 0), 0);
    if (Math.abs(totalPercentage - 100) > 0.1) {
      throw new Error('Split percentages must total 100%');
    }
  }
};

// Method to calculate equal splits
mongoExpenseSchema.methods.calculateEqualSplits = function(users) {
  const splitAmount = this.amount / users.length;
  this.splits = users.map(userId => ({
    userId: userId,
    amount: splitAmount,
    weight: 1,
    isPaid: false
  }));
};

const MongoExpense = mongoose.model('Expense', mongoExpenseSchema);

// PostgreSQL Model using Sequelize
const createPostgresExpenseModel = (sequelize) => {
  const PostgresExpense = sequelize.define('Expense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        len: {
          args: [1, 200],
          msg: 'Description must be between 1 and 200 characters'
        }
      },
      set(value) {
        this.setDataValue('description', value.trim());
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: {
          args: 0.01,
          msg: 'Amount must be greater than 0'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'USD',
      validate: {
        isIn: {
          args: [SUPPORTED_CURRENCIES],
          msg: 'Currency is not supported'
        }
      },
      set(value) {
        this.setDataValue('currency', value.toUpperCase());
      }
    },
    category: {
      type: DataTypes.ENUM(...EXPENSE_CATEGORIES),
      defaultValue: 'other'
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        isDate: true,
        isBefore: {
          args: new Date().toISOString(),
          msg: 'Expense date cannot be in the future'
        }
      }
    },
    paidBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id'
      }
    },
    splitMethod: {
      type: DataTypes.ENUM(...SPLIT_METHODS),
      defaultValue: 'equal'
    },
    receipt: {
      type: DataTypes.JSONB,
      defaultValue: null,
      validate: {
        isValidReceipt(value) {
          if (value && (!value.filename || !value.path)) {
            throw new Error('Receipt must have filename and path');
          }
        }
      }
    },
    notes: {
      type: DataTypes.TEXT,
      validate: {
        len: {
          args: [0, 1000],
          msg: 'Notes cannot exceed 1000 characters'
        }
      }
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    fraudScore: {
      type: DataTypes.JSONB,
      defaultValue: {
        score: 0,
        reasons: [],
        analyzedAt: null,
        isReviewed: false
      }
    },
    exchangeRate: {
      type: DataTypes.JSONB,
      defaultValue: null
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    approvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deletedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'expenses',
    timestamps: true,
    paranoid: true,
    deletedAt: 'deletedAt',
    indexes: [
      {
        fields: ['groupId', 'date']
      },
      {
        fields: ['paidBy']
      },
      {
        fields: ['category']
      },
      {
        fields: ['isDeleted']
      }
    ]
  });

  return PostgresExpense;
};

// Expense Split model for PostgreSQL
const createPostgresExpenseSplitModel = (sequelize) => {
  const PostgresExpenseSplit = sequelize.define('ExpenseSplit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    expenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'expenses',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      validate: {
        min: 0,
        max: 100
      }
    },
    weight: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 1,
      validate: {
        min: 0
      }
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'expense_splits',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['expenseId', 'userId']
      },
      {
        fields: ['userId']
      },
      {
        fields: ['expenseId']
      },
      {
        fields: ['isPaid']
      }
    ]
  });

  return PostgresExpenseSplit;
};

module.exports = {
  MongoExpense,
  createPostgresExpenseModel,
  createPostgresExpenseSplitModel,
  SUPPORTED_CURRENCIES,
  SPLIT_METHODS,
  EXPENSE_CATEGORIES
};