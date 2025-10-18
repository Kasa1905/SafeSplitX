/**
 * User Model for SafeSplitX
 * Supports both MongoDB (Mongoose) and PostgreSQL (Sequelize)
 */

const mongoose = require('mongoose');
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// MongoDB Schema using Mongoose
const mongoUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long'],
    select: false // Don't include password in queries by default
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  profileImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: {
    type: String,
    select: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.passwordResetExpires;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for MongoDB
mongoUserSchema.index({ email: 1 });
mongoUserSchema.index({ phone: 1 });
mongoUserSchema.index({ createdAt: -1 });

// Virtual for full name
mongoUserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware to hash password
mongoUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
mongoUserSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Method to check if account is locked
mongoUserSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

const MongoUser = mongoose.model('User', mongoUserSchema);

// PostgreSQL Model using Sequelize
const createPostgresUserModel = (sequelize) => {
  const PostgresUser = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: {
          msg: 'Please enter a valid email'
        }
      },
      set(value) {
        this.setDataValue('email', value.toLowerCase().trim());
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        len: {
          args: [8, 255],
          msg: 'Password must be at least 8 characters long'
        }
      }
    },
    firstName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: {
          args: [1, 50],
          msg: 'First name must be between 1 and 50 characters'
        }
      },
      set(value) {
        this.setDataValue('firstName', value.trim());
      }
    },
    lastName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        len: {
          args: [1, 50],
          msg: 'Last name must be between 1 and 50 characters'
        }
      },
      set(value) {
        this.setDataValue('lastName', value.trim());
      }
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        is: {
          args: /^\+?[\d\s\-\(\)]+$/,
          msg: 'Please enter a valid phone number'
        }
      }
    },
    profileImage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwordResetToken: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lockUntil: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'users',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['email']
      },
      {
        fields: ['phone']
      },
      {
        fields: ['createdAt']
      }
    ],
    hooks: {
      beforeCreate: async (user) => {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        user.password = await bcrypt.hash(user.password, saltRounds);
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
          user.password = await bcrypt.hash(user.password, saltRounds);
        }
      }
    }
  });

  // Instance methods
  PostgresUser.prototype.comparePassword = async function(candidatePassword) {
    try {
      return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
      throw error;
    }
  };

  PostgresUser.prototype.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > new Date());
  };

  // Virtual for full name
  PostgresUser.prototype.getFullName = function() {
    return `${this.firstName} ${this.lastName}`;
  };

  return PostgresUser;
};

module.exports = {
  MongoUser,
  createPostgresUserModel
};