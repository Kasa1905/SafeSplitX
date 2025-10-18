/**
 * Settlement Model for SafeSplitX
 * Supports both MongoDB (Mongoose) and PostgreSQL (Sequelize)
 */

const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');

// Settlement status options
const SETTLEMENT_STATUS = ['pending', 'in_progress', 'completed', 'cancelled', 'failed'];

// Settlement types
const SETTLEMENT_TYPES = ['direct', 'optimized', 'split'];

// Payment methods
const PAYMENT_METHODS = ['stripe', 'paypal', 'venmo', 'cash', 'bank_transfer', 'other'];

// MongoDB Schema using Mongoose
const mongoSettlementSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: [true, 'Group is required']
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payer is required']
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Payee is required']
  },
  amount: {
    type: Number,
    required: [true, 'Settlement amount is required'],
    min: [0.01, 'Amount must be greater than 0']
  },
  currency: {
    type: String,
    required: [true, 'Currency is required'],
    uppercase: true
  },
  type: {
    type: String,
    enum: SETTLEMENT_TYPES,
    default: 'direct'
  },
  status: {
    type: String,
    enum: SETTLEMENT_STATUS,
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: PAYMENT_METHODS,
    default: 'other'
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  expenses: [{
    expense: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Expense'
    },
    amount: {
      type: Number,
      min: 0
    }
  }],
  transactionId: {
    type: String,
    sparse: true
  },
  paymentData: {
    stripePaymentIntentId: String,
    paypalOrderId: String,
    venmoTransactionId: String,
    bankTransferRef: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  dueDate: {
    type: Date,
    validate: {
      validator: function(date) {
        return !date || date > new Date();
      },
      message: 'Due date must be in the future'
    }
  },
  completedAt: Date,
  cancelledAt: Date,
  cancelReason: {
    type: String,
    maxlength: [500, 'Cancel reason cannot exceed 500 characters']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  remindersSent: {
    type: Number,
    default: 0,
    min: 0
  },
  lastReminderAt: Date,
  fraudScore: {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    reasons: [String],
    analyzedAt: Date
  },
  exchangeRate: {
    from: String,
    to: String,
    rate: Number,
    date: Date
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
mongoSettlementSchema.index({ group: 1, status: 1 });
mongoSettlementSchema.index({ from: 1, status: 1 });
mongoSettlementSchema.index({ to: 1, status: 1 });
mongoSettlementSchema.index({ dueDate: 1 });
mongoSettlementSchema.index({ transactionId: 1 });
mongoSettlementSchema.index({ createdAt: -1 });

// Virtual for whether settlement is overdue
mongoSettlementSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status === 'pending';
});

// Method to mark as completed
mongoSettlementSchema.methods.markCompleted = function(transactionId = null) {
  this.status = 'completed';
  this.completedAt = new Date();
  if (transactionId) {
    this.transactionId = transactionId;
  }
};

// Method to cancel settlement
mongoSettlementSchema.methods.cancel = function(reason) {
  if (this.status === 'completed') {
    throw new Error('Cannot cancel completed settlement');
  }
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelReason = reason;
};

// Method to send reminder
mongoSettlementSchema.methods.sendReminder = function() {
  if (this.status !== 'pending') {
    throw new Error('Can only send reminders for pending settlements');
  }
  this.remindersSent += 1;
  this.lastReminderAt = new Date();
};

const MongoSettlement = mongoose.model('Settlement', mongoSettlementSchema);

// PostgreSQL Model using Sequelize
const createPostgresSettlementModel = (sequelize) => {
  const PostgresSettlement = sequelize.define('Settlement', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    groupId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'id'
      }
    },
    fromUserId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    toUserId: {
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
        min: {
          args: 0.01,
          msg: 'Amount must be greater than 0'
        }
      }
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM(...SETTLEMENT_TYPES),
      defaultValue: 'direct'
    },
    status: {
      type: DataTypes.ENUM(...SETTLEMENT_STATUS),
      defaultValue: 'pending'
    },
    paymentMethod: {
      type: DataTypes.ENUM(...PAYMENT_METHODS),
      defaultValue: 'other'
    },
    description: {
      type: DataTypes.STRING(200),
      validate: {
        len: {
          args: [0, 200],
          msg: 'Description cannot exceed 200 characters'
        }
      }
    },
    transactionId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    },
    paymentData: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    dueDate: {
      type: DataTypes.DATE,
      validate: {
        isDate: true,
        isAfter: {
          args: new Date().toISOString(),
          msg: 'Due date must be in the future'
        }
      }
    },
    completedAt: {
      type: DataTypes.DATE
    },
    cancelledAt: {
      type: DataTypes.DATE
    },
    cancelReason: {
      type: DataTypes.TEXT,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Cancel reason cannot exceed 500 characters'
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
    remindersSent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    lastReminderAt: {
      type: DataTypes.DATE
    },
    fraudScore: {
      type: DataTypes.JSONB,
      defaultValue: {
        score: 0,
        reasons: [],
        analyzedAt: null
      }
    },
    exchangeRate: {
      type: DataTypes.JSONB,
      defaultValue: null
    }
  }, {
    tableName: 'settlements',
    timestamps: true,
    indexes: [
      {
        fields: ['groupId', 'status']
      },
      {
        fields: ['fromUserId', 'status']
      },
      {
        fields: ['toUserId', 'status']
      },
      {
        fields: ['dueDate']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return PostgresSettlement;
};

// Settlement Expense model for PostgreSQL (many-to-many relationship)
const createPostgresSettlementExpenseModel = (sequelize) => {
  const PostgresSettlementExpense = sequelize.define('SettlementExpense', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    settlementId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'settlements',
        key: 'id'
      }
    },
    expenseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'expenses',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    }
  }, {
    tableName: 'settlement_expenses',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['settlementId', 'expenseId']
      },
      {
        fields: ['settlementId']
      },
      {
        fields: ['expenseId']
      }
    ]
  });

  return PostgresSettlementExpense;
};

module.exports = {
  MongoSettlement,
  createPostgresSettlementModel,
  createPostgresSettlementExpenseModel,
  SETTLEMENT_STATUS,
  SETTLEMENT_TYPES,
  PAYMENT_METHODS
};