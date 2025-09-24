/**
 * Group Model for SafeSplitX
 * Supports both MongoDB (Mongoose) and PostgreSQL (Sequelize)
 */

const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');

// Supported currencies
const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'];

// Split methods
const SPLIT_METHODS = ['equal', 'weighted', 'percentage', 'custom'];

// MongoDB Schema using Mongoose
const mongoGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Group creator is required']
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  settings: {
    defaultSplitMethod: {
      type: String,
      enum: SPLIT_METHODS,
      default: 'equal'
    },
    allowSelfPayments: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
    maxMembers: {
      type: Number,
      default: 50,
      min: [2, 'Group must have at least 2 members'],
      max: [100, 'Group cannot exceed 100 members']
    }
  },
  totalExpenses: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  archivedAt: {
    type: Date,
    default: null
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
mongoGroupSchema.index({ createdBy: 1 });
mongoGroupSchema.index({ 'members.user': 1 });
mongoGroupSchema.index({ isActive: 1 });
mongoGroupSchema.index({ createdAt: -1 });

// Virtual for active members count
mongoGroupSchema.virtual('activeMembersCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Method to check if user is member
mongoGroupSchema.methods.isMember = function(userId) {
  return this.members.some(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
};

// Method to check if user is admin
mongoGroupSchema.methods.isAdmin = function(userId) {
  const member = this.members.find(member => 
    member.user.toString() === userId.toString() && member.isActive
  );
  return member && member.role === 'admin';
};

// Method to add member
mongoGroupSchema.methods.addMember = function(userId, role = 'member') {
  if (this.isMember(userId)) {
    throw new Error('User is already a member of this group');
  }
  
  if (this.activeMembersCount >= this.settings.maxMembers) {
    throw new Error('Group has reached maximum member limit');
  }
  
  this.members.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
    isActive: true
  });
};

const MongoGroup = mongoose.model('Group', mongoGroupSchema);

// PostgreSQL Model using Sequelize
const createPostgresGroupModel = (sequelize) => {
  const PostgresGroup = sequelize.define('Group', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        len: {
          args: [1, 100],
          msg: 'Group name must be between 1 and 100 characters'
        }
      },
      set(value) {
        this.setDataValue('name', value.trim());
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      validate: {
        len: {
          args: [0, 500],
          msg: 'Description cannot exceed 500 characters'
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
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    settings: {
      type: DataTypes.JSONB,
      defaultValue: {
        defaultSplitMethod: 'equal',
        allowSelfPayments: true,
        requireApproval: false,
        maxMembers: 50
      },
      validate: {
        isValidSettings(value) {
          if (!value.defaultSplitMethod || !SPLIT_METHODS.includes(value.defaultSplitMethod)) {
            throw new Error('Invalid default split method');
          }
          if (typeof value.allowSelfPayments !== 'boolean') {
            throw new Error('allowSelfPayments must be a boolean');
          }
          if (typeof value.requireApproval !== 'boolean') {
            throw new Error('requireApproval must be a boolean');
          }
          if (!Number.isInteger(value.maxMembers) || value.maxMembers < 2 || value.maxMembers > 100) {
            throw new Error('maxMembers must be between 2 and 100');
          }
        }
      }
    },
    totalExpenses: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'groups',
    timestamps: true,
    indexes: [
      {
        fields: ['createdBy']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return PostgresGroup;
};

// Group Member model for PostgreSQL
const createPostgresGroupMemberModel = (sequelize) => {
  const PostgresGroupMember = sequelize.define('GroupMember', {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    role: {
      type: DataTypes.ENUM('admin', 'member'),
      defaultValue: 'member'
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'group_members',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['groupId', 'userId'],
        where: {
          isActive: true
        }
      },
      {
        fields: ['userId']
      },
      {
        fields: ['groupId']
      }
    ]
  });

  return PostgresGroupMember;
};

module.exports = {
  MongoGroup,
  createPostgresGroupModel,
  createPostgresGroupMemberModel,
  SUPPORTED_CURRENCIES,
  SPLIT_METHODS
};