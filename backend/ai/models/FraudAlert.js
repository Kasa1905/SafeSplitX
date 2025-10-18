const mongoose = require('mongoose');

const fraudAlertSchema = new mongoose.Schema({
  // Alert identification
  alertId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `FA_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },

  // Alert type and category
  type: {
    type: String,
    required: true,
    enum: [
      'FRAUD_DETECTION',
      'PATTERN_DETECTION',
      'RULE_VIOLATION',
      'ANOMALY_DETECTION',
      'THRESHOLD_BREACH',
      'MANUAL_REVIEW'
    ],
    index: true
  },

  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    index: true
  },

  // Related entities
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: false,
    index: true
  },

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: false,
    index: true
  },

  // Fraud analysis reference
  analysisId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FraudAnalysis',
    required: false,
    index: true
  },

  // Alert content
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  message: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Fraud detection details
  fraudScore: {
    type: Number,
    required: false,
    min: 0,
    max: 1,
    index: true
  },

  triggeredRules: [{
    type: String,
    required: false
  }],

  // Alert metadata
  metadata: {
    analysisComponents: [String],
    confidence: Number,
    autoFlag: Boolean,
    processingTime: Number,
    modelVersion: String,
    ruleVersions: mongoose.Schema.Types.Mixed,
    contextData: mongoose.Schema.Types.Mixed,
    additionalInfo: mongoose.Schema.Types.Mixed
  },

  // Alert status and resolution
  status: {
    type: String,
    required: true,
    enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED', 'ESCALATED'],
    default: 'OPEN',
    index: true
  },

  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 5,
    index: true
  },

  // Assignment and resolution
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  assignedAt: {
    type: Date,
    required: false
  },

  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  resolvedAt: {
    type: Date,
    required: false
  },

  resolution: {
    type: String,
    required: false,
    enum: [
      'FALSE_POSITIVE',
      'TRUE_POSITIVE_RESOLVED', 
      'TRUE_POSITIVE_ACTION_TAKEN',
      'ESCALATED_TO_ADMIN',
      'USER_EDUCATION_PROVIDED',
      'SYSTEM_IMPROVEMENT_NEEDED'
    ]
  },

  resolutionNotes: {
    type: String,
    required: false,
    maxlength: 2000
  },

  // Escalation tracking
  escalationLevel: {
    type: Number,
    required: false,
    min: 0,
    max: 5,
    default: 0
  },

  escalatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  escalatedAt: {
    type: Date,
    required: false
  },

  escalationReason: {
    type: String,
    required: false
  },

  // Notification tracking
  notifications: [{
    channel: {
      type: String,
      enum: ['EMAIL', 'SLACK', 'SMS', 'PUSH', 'WEBHOOK'],
      required: true
    },
    recipient: {
      type: String,
      required: true
    },
    sentAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'FAILED', 'BOUNCED'],
      required: true
    },
    response: mongoose.Schema.Types.Mixed
  }],

  // Follow-up actions
  followUpActions: [{
    action: {
      type: String,
      required: true
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false
    },
    dueDate: {
      type: Date,
      required: false
    },
    status: {
      type: String,
      enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
      default: 'PENDING'
    },
    completedAt: {
      type: Date,
      required: false
    },
    notes: String
  }],

  // Analytics and tracking
  viewCount: {
    type: Number,
    default: 0
  },

  lastViewedAt: {
    type: Date,
    required: false
  },

  lastViewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // Tags for categorization
  tags: [{
    type: String,
    maxlength: 50
  }],

  // External references
  externalReferences: [{
    system: String,
    referenceId: String,
    url: String,
    type: String
  }]
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'fraud_alerts'
});

// Indexes for performance
fraudAlertSchema.index({ createdAt: -1 });
fraudAlertSchema.index({ status: 1, createdAt: -1 });
fraudAlertSchema.index({ severity: 1, status: 1 });
fraudAlertSchema.index({ userId: 1, createdAt: -1 });
fraudAlertSchema.index({ assignedTo: 1, status: 1 });
fraudAlertSchema.index({ type: 1, severity: 1, createdAt: -1 });
fraudAlertSchema.index({ fraudScore: -1, createdAt: -1 });
fraudAlertSchema.index({ priority: -1, createdAt: -1 });

// Compound indexes for complex queries
fraudAlertSchema.index({ status: 1, priority: -1, createdAt: -1 });
fraudAlertSchema.index({ assignedTo: 1, status: 1, priority: -1 });
fraudAlertSchema.index({ userId: 1, status: 1, severity: 1 });

// TTL index for old resolved/dismissed alerts
fraudAlertSchema.index(
  { resolvedAt: 1 },
  { 
    expireAfterSeconds: 180 * 24 * 60 * 60, // 6 months
    partialFilterExpression: { 
      status: { $in: ['RESOLVED', 'DISMISSED'] },
      severity: { $in: ['LOW', 'MEDIUM'] }
    }
  }
);

// Virtual fields
fraudAlertSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

fraudAlertSchema.virtual('ageInHours').get(function() {
  return Math.floor(this.age / (1000 * 60 * 60));
});

fraudAlertSchema.virtual('isOverdue').get(function() {
  const maxAge = {
    'CRITICAL': 2 * 60 * 60 * 1000, // 2 hours
    'HIGH': 8 * 60 * 60 * 1000, // 8 hours
    'MEDIUM': 24 * 60 * 60 * 1000, // 24 hours
    'LOW': 72 * 60 * 60 * 1000 // 72 hours
  };
  
  return this.status === 'OPEN' && this.age > (maxAge[this.severity] || maxAge.LOW);
});

// Virtual population
fraudAlertSchema.virtual('expense', {
  ref: 'Expense',
  localField: 'expenseId',
  foreignField: '_id',
  justOne: true
});

fraudAlertSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

fraudAlertSchema.virtual('group', {
  ref: 'Group',
  localField: 'groupId',
  foreignField: '_id',
  justOne: true
});

fraudAlertSchema.virtual('analysis', {
  ref: 'FraudAnalysis',
  localField: 'analysisId',
  foreignField: '_id',
  justOne: true
});

// Instance methods
fraudAlertSchema.methods.assign = function(userId, notes = '') {
  this.assignedTo = userId;
  this.assignedAt = new Date();
  this.status = 'IN_PROGRESS';
  if (notes) {
    this.resolutionNotes = notes;
  }
  return this.save();
};

fraudAlertSchema.methods.resolve = function(userId, resolution, notes = '') {
  this.status = 'RESOLVED';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolution = resolution;
  this.resolutionNotes = notes;
  return this.save();
};

fraudAlertSchema.methods.dismiss = function(userId, notes = '') {
  this.status = 'DISMISSED';
  this.resolvedBy = userId;
  this.resolvedAt = new Date();
  this.resolution = 'FALSE_POSITIVE';
  this.resolutionNotes = notes;
  return this.save();
};

fraudAlertSchema.methods.escalate = function(toUserId, reason = '', level = null) {
  this.status = 'ESCALATED';
  this.escalatedTo = toUserId;
  this.escalatedAt = new Date();
  this.escalationReason = reason;
  this.escalationLevel = level || (this.escalationLevel + 1);
  
  // Increase priority when escalated
  if (this.priority < 10) {
    this.priority = Math.min(10, this.priority + 2);
  }
  
  return this.save();
};

fraudAlertSchema.methods.addNotification = function(channel, recipient, status, response) {
  this.notifications.push({
    channel,
    recipient,
    status,
    response,
    sentAt: new Date()
  });
  return this.save();
};

fraudAlertSchema.methods.addFollowUpAction = function(action, assignee = null, dueDate = null) {
  this.followUpActions.push({
    action,
    assignee,
    dueDate,
    status: 'PENDING'
  });
  return this.save();
};

fraudAlertSchema.methods.recordView = function(userId) {
  this.viewCount += 1;
  this.lastViewedAt = new Date();
  this.lastViewedBy = userId;
  return this.save();
};

// Static methods
fraudAlertSchema.statics.getOpenAlerts = function(options = {}) {
  const query = { status: 'OPEN' };
  
  if (options.severity) {
    query.severity = options.severity;
  }
  
  if (options.assignedTo) {
    query.assignedTo = options.assignedTo;
  }
  
  if (options.userId) {
    query.userId = options.userId;
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .limit(options.limit || 50)
    .populate('user expense group analysis');
};

fraudAlertSchema.statics.getOverdueAlerts = function() {
  const now = new Date();
  const criticalThreshold = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours
  const highThreshold = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours
  const mediumThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours
  const lowThreshold = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours
  
  return this.find({
    status: 'OPEN',
    $or: [
      { severity: 'CRITICAL', createdAt: { $lt: criticalThreshold } },
      { severity: 'HIGH', createdAt: { $lt: highThreshold } },
      { severity: 'MEDIUM', createdAt: { $lt: mediumThreshold } },
      { severity: 'LOW', createdAt: { $lt: lowThreshold } }
    ]
  }).sort({ priority: -1, createdAt: 1 });
};

fraudAlertSchema.statics.getAlertsSummary = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          severity: '$severity',
          status: '$status'
        },
        count: { $sum: 1 },
        avgResolutionTime: {
          $avg: {
            $cond: [
              { $ne: ['$resolvedAt', null] },
              { $subtract: ['$resolvedAt', '$createdAt'] },
              null
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: '$_id.severity',
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$count',
            avgResolutionTime: '$avgResolutionTime'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);
};

fraudAlertSchema.statics.getUserAlertHistory = function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.find({
    userId: userId,
    createdAt: { $gte: startDate }
  })
  .sort({ createdAt: -1 })
  .populate('expense analysis');
};

// Pre-save middleware
fraudAlertSchema.pre('save', function(next) {
  // Auto-generate title if not provided
  if (!this.title && this.type) {
    const titles = {
      'FRAUD_DETECTION': 'Fraud Detected',
      'PATTERN_DETECTION': 'Suspicious Pattern Detected',
      'RULE_VIOLATION': 'Rule Violation Detected',
      'ANOMALY_DETECTION': 'Anomaly Detected',
      'THRESHOLD_BREACH': 'Threshold Breached',
      'MANUAL_REVIEW': 'Manual Review Required'
    };
    this.title = titles[this.type] || 'Alert';
  }
  
  // Set priority based on severity if not set
  if (!this.priority || this.priority === 5) {
    const priorities = {
      'CRITICAL': 10,
      'HIGH': 8,
      'MEDIUM': 5,
      'LOW': 3
    };
    this.priority = priorities[this.severity] || 5;
  }
  
  next();
});

// Post-save middleware for logging and notifications
fraudAlertSchema.post('save', function(doc) {
  if (doc.isNew && doc.severity === 'CRITICAL') {
    console.log(`CRITICAL fraud alert created: ${doc.alertId}`);
    // TODO: Trigger immediate notification
  }
});

module.exports = mongoose.model('FraudAlert', fraudAlertSchema);