const mongoose = require('mongoose');

const fraudRuleSchema = new mongoose.Schema({
  // Rule identification
  ruleId: {
    type: String,
    required: true,
    unique: true,
    default: function() {
      return `FR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  },

  // Rule metadata
  name: {
    type: String,
    required: true,
    maxlength: 200,
    index: true
  },

  description: {
    type: String,
    required: true,
    maxlength: 1000
  },

  category: {
    type: String,
    required: true,
    enum: [
      'AMOUNT_BASED',
      'FREQUENCY_BASED',
      'TIMING_BASED',
      'USER_BEHAVIOR',
      'PATTERN_BASED',
      'LOCATION_BASED',
      'CATEGORY_BASED',
      'DUPLICATE_DETECTION',
      'THRESHOLD_BASED',
      'CUSTOM'
    ],
    index: true
  },

  type: {
    type: String,
    required: true,
    enum: ['BUILT_IN', 'CUSTOM', 'USER_DEFINED', 'ML_GENERATED'],
    default: 'CUSTOM',
    index: true
  },

  // Rule configuration
  isActive: {
    type: Boolean,
    required: true,
    default: true,
    index: true
  },

  severity: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM',
    index: true
  },

  priority: {
    type: Number,
    required: true,
    min: 1,
    max: 100,
    default: 50,
    index: true
  },

  // Rule logic
  conditions: [{
    field: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      required: true,
      enum: [
        'EQUALS', 'NOT_EQUALS',
        'GREATER_THAN', 'GREATER_THAN_OR_EQUAL',
        'LESS_THAN', 'LESS_THAN_OR_EQUAL',
        'CONTAINS', 'NOT_CONTAINS',
        'STARTS_WITH', 'ENDS_WITH',
        'IN', 'NOT_IN',
        'REGEX', 'EXISTS',
        'BETWEEN', 'NOT_BETWEEN'
      ]
    },
    value: mongoose.Schema.Types.Mixed,
    valueType: {
      type: String,
      enum: ['STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'ARRAY', 'OBJECT'],
      default: 'STRING'
    }
  }],

  // Logical operators between conditions
  logicalOperator: {
    type: String,
    enum: ['AND', 'OR'],
    default: 'AND'
  },

  // Actions to take when rule is triggered
  actions: [{
    type: {
      type: String,
      required: true,
      enum: [
        'CREATE_ALERT',
        'BLOCK_TRANSACTION',
        'REQUIRE_APPROVAL',
        'SEND_NOTIFICATION',
        'LOG_EVENT',
        'ESCALATE',
        'CUSTOM_FUNCTION'
      ]
    },
    config: mongoose.Schema.Types.Mixed
  }],

  // Thresholds and scoring
  scoreImpact: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    default: 0.1
  },

  threshold: {
    type: Number,
    required: false,
    min: 0,
    max: 1
  },

  // Time-based configuration
  timeWindow: {
    enabled: {
      type: Boolean,
      default: false
    },
    duration: {
      type: Number, // in minutes
      required: false
    },
    unit: {
      type: String,
      enum: ['MINUTES', 'HOURS', 'DAYS', 'WEEKS'],
      default: 'HOURS'
    }
  },

  // Rate limiting
  rateLimit: {
    enabled: {
      type: Boolean,
      default: false
    },
    maxTriggers: {
      type: Number,
      required: false,
      min: 1
    },
    windowMinutes: {
      type: Number,
      required: false,
      min: 1
    }
  },

  // Context and filters
  applicableContexts: [{
    type: String,
    enum: [
      'ALL',
      'NEW_USER', 'EXISTING_USER',
      'PERSONAL_EXPENSE', 'GROUP_EXPENSE',
      'HIGH_AMOUNT', 'LOW_AMOUNT',
      'BUSINESS_HOURS', 'AFTER_HOURS',
      'WEEKEND', 'WEEKDAY',
      'MOBILE_APP', 'WEB_APP'
    ],
    default: 'ALL'
  }],

  // Exclusions
  exclusions: {
    users: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    }],
    groups: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Group' 
    }],
    categories: [String],
    conditions: [mongoose.Schema.Types.Mixed]
  },

  // Rule performance and statistics
  statistics: {
    triggeredCount: {
      type: Number,
      default: 0
    },
    truePositives: {
      type: Number,
      default: 0
    },
    falsePositives: {
      type: Number,
      default: 0
    },
    lastTriggered: {
      type: Date,
      required: false
    },
    avgProcessingTime: {
      type: Number,
      default: 0
    },
    effectiveness: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    }
  },

  // Version control
  version: {
    type: Number,
    required: true,
    default: 1
  },

  previousVersions: [{
    version: Number,
    config: mongoose.Schema.Types.Mixed,
    changedAt: Date,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changeReason: String
  }],

  // Ownership and permissions
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // Access control
  visibility: {
    type: String,
    enum: ['PUBLIC', 'PRIVATE', 'SHARED'],
    default: 'PRIVATE'
  },

  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    permissions: {
      type: String,
      enum: ['VIEW', 'EDIT', 'ADMIN'],
      default: 'VIEW'
    }
  }],

  // Testing and validation
  testResults: [{
    testDate: Date,
    testData: mongoose.Schema.Types.Mixed,
    expectedResult: Boolean,
    actualResult: Boolean,
    passed: Boolean,
    notes: String
  }],

  // Dependencies
  dependencies: [{
    ruleId: String,
    relationship: {
      type: String,
      enum: ['PREREQUISITE', 'CONFLICTS_WITH', 'ENHANCES', 'REPLACES']
    },
    description: String
  }],

  // External integrations
  integrations: [{
    system: String,
    endpoint: String,
    config: mongoose.Schema.Types.Mixed,
    enabled: {
      type: Boolean,
      default: false
    }
  }],

  // Machine learning integration
  mlModel: {
    enabled: {
      type: Boolean,
      default: false
    },
    modelId: String,
    confidence: {
      type: Number,
      min: 0,
      max: 1
    },
    features: [String],
    lastTrained: Date
  },

  // Tags for organization
  tags: [{
    type: String,
    maxlength: 50
  }],

  // Scheduling
  schedule: {
    enabled: {
      type: Boolean,
      default: false
    },
    activeHours: {
      start: String, // HH:MM format
      end: String    // HH:MM format
    },
    activeDays: [{
      type: Number,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    }],
    timezone: {
      type: String,
      default: 'UTC'
    }
  }
}, {
  timestamps: true,
  collection: 'fraud_rules'
});

// Indexes for performance
fraudRuleSchema.index({ isActive: 1, priority: -1 });
fraudRuleSchema.index({ category: 1, isActive: 1 });
fraudRuleSchema.index({ type: 1, isActive: 1 });
fraudRuleSchema.index({ severity: 1, isActive: 1 });
fraudRuleSchema.index({ createdBy: 1, isActive: 1 });
fraudRuleSchema.index({ 'statistics.effectiveness': -1 });
fraudRuleSchema.index({ 'statistics.lastTriggered': -1 });

// Compound indexes
fraudRuleSchema.index({ isActive: 1, priority: -1, category: 1 });
fraudRuleSchema.index({ type: 1, severity: 1, isActive: 1 });

// Text index for search
fraudRuleSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

// Virtual fields
fraudRuleSchema.virtual('accuracyRate').get(function() {
  const total = this.statistics.truePositives + this.statistics.falsePositives;
  return total > 0 ? this.statistics.truePositives / total : 0;
});

fraudRuleSchema.virtual('isEffective').get(function() {
  return this.statistics.effectiveness > 0.7 && this.accuracyRate > 0.8;
});

fraudRuleSchema.virtual('recentActivity').get(function() {
  if (!this.statistics.lastTriggered) return 'Never';
  
  const daysSinceLastTrigger = Math.floor(
    (Date.now() - this.statistics.lastTriggered.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSinceLastTrigger === 0) return 'Today';
  if (daysSinceLastTrigger === 1) return 'Yesterday';
  if (daysSinceLastTrigger <= 7) return `${daysSinceLastTrigger} days ago`;
  if (daysSinceLastTrigger <= 30) return `${Math.floor(daysSinceLastTrigger / 7)} weeks ago`;
  return `${Math.floor(daysSinceLastTrigger / 30)} months ago`;
});

// Instance methods
fraudRuleSchema.methods.evaluate = function(data) {
  if (!this.isActive) {
    return { triggered: false, reason: 'Rule is inactive' };
  }

  // Check time window constraints
  if (this.schedule.enabled && !this.isWithinSchedule()) {
    return { triggered: false, reason: 'Outside scheduled hours' };
  }

  // Check rate limiting
  if (this.rateLimit.enabled && this.isRateLimited()) {
    return { triggered: false, reason: 'Rate limit exceeded' };
  }

  // Evaluate conditions
  const result = this.evaluateConditions(data);
  
  if (result.triggered) {
    this.recordTrigger();
  }
  
  return result;
};

fraudRuleSchema.methods.evaluateConditions = function(data) {
  if (!this.conditions || this.conditions.length === 0) {
    return { triggered: false, reason: 'No conditions defined' };
  }

  const results = this.conditions.map(condition => {
    return this.evaluateCondition(condition, data);
  });

  const triggered = this.logicalOperator === 'AND' 
    ? results.every(r => r.result)
    : results.some(r => r.result);

  return {
    triggered,
    reason: triggered ? 'All conditions met' : 'Conditions not met',
    conditionResults: results,
    score: triggered ? this.scoreImpact : 0
  };
};

fraudRuleSchema.methods.evaluateCondition = function(condition, data) {
  const fieldValue = this.getFieldValue(data, condition.field);
  const expectedValue = condition.value;
  const operator = condition.operator;

  let result = false;

  switch (operator) {
    case 'EQUALS':
      result = fieldValue === expectedValue;
      break;
    case 'NOT_EQUALS':
      result = fieldValue !== expectedValue;
      break;
    case 'GREATER_THAN':
      result = Number(fieldValue) > Number(expectedValue);
      break;
    case 'GREATER_THAN_OR_EQUAL':
      result = Number(fieldValue) >= Number(expectedValue);
      break;
    case 'LESS_THAN':
      result = Number(fieldValue) < Number(expectedValue);
      break;
    case 'LESS_THAN_OR_EQUAL':
      result = Number(fieldValue) <= Number(expectedValue);
      break;
    case 'CONTAINS':
      result = String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      break;
    case 'NOT_CONTAINS':
      result = !String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase());
      break;
    case 'STARTS_WITH':
      result = String(fieldValue).toLowerCase().startsWith(String(expectedValue).toLowerCase());
      break;
    case 'ENDS_WITH':
      result = String(fieldValue).toLowerCase().endsWith(String(expectedValue).toLowerCase());
      break;
    case 'IN':
      result = Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      break;
    case 'NOT_IN':
      result = Array.isArray(expectedValue) && !expectedValue.includes(fieldValue);
      break;
    case 'REGEX':
      try {
        const regex = new RegExp(expectedValue, 'i');
        result = regex.test(String(fieldValue));
      } catch (error) {
        result = false;
      }
      break;
    case 'EXISTS':
      result = fieldValue !== undefined && fieldValue !== null;
      break;
    case 'BETWEEN':
      if (Array.isArray(expectedValue) && expectedValue.length === 2) {
        const numValue = Number(fieldValue);
        result = numValue >= expectedValue[0] && numValue <= expectedValue[1];
      }
      break;
    case 'NOT_BETWEEN':
      if (Array.isArray(expectedValue) && expectedValue.length === 2) {
        const numValue = Number(fieldValue);
        result = numValue < expectedValue[0] || numValue > expectedValue[1];
      }
      break;
    default:
      result = false;
  }

  return {
    condition: condition.field,
    operator,
    expected: expectedValue,
    actual: fieldValue,
    result
  };
};

fraudRuleSchema.methods.getFieldValue = function(data, fieldPath) {
  const fields = fieldPath.split('.');
  let value = data;
  
  for (const field of fields) {
    if (value && typeof value === 'object' && field in value) {
      value = value[field];
    } else {
      return undefined;
    }
  }
  
  return value;
};

fraudRuleSchema.methods.recordTrigger = function() {
  this.statistics.triggeredCount += 1;
  this.statistics.lastTriggered = new Date();
  return this.save();
};

fraudRuleSchema.methods.recordFeedback = function(isTrue) {
  if (isTrue) {
    this.statistics.truePositives += 1;
  } else {
    this.statistics.falsePositives += 1;
  }
  
  this.updateEffectiveness();
  return this.save();
};

fraudRuleSchema.methods.updateEffectiveness = function() {
  const total = this.statistics.truePositives + this.statistics.falsePositives;
  if (total > 0) {
    this.statistics.effectiveness = this.statistics.truePositives / total;
  }
};

fraudRuleSchema.methods.isWithinSchedule = function() {
  if (!this.schedule.enabled) return true;
  
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  // Check if current day is in active days
  if (this.schedule.activeDays.length > 0 && !this.schedule.activeDays.includes(currentDay)) {
    return false;
  }
  
  // Check if current time is within active hours
  if (this.schedule.activeHours.start && this.schedule.activeHours.end) {
    return currentTime >= this.schedule.activeHours.start && currentTime <= this.schedule.activeHours.end;
  }
  
  return true;
};

fraudRuleSchema.methods.isRateLimited = function() {
  if (!this.rateLimit.enabled) return false;
  
  const windowStart = new Date(Date.now() - this.rateLimit.windowMinutes * 60 * 1000);
  
  // This would typically query a separate collection for rate limiting
  // For now, we'll return false as a placeholder
  return false;
};

fraudRuleSchema.methods.createNewVersion = function(changes, userId, reason) {
  // Store current version in history
  this.previousVersions.push({
    version: this.version,
    config: this.toObject(),
    changedAt: new Date(),
    changedBy: userId,
    changeReason: reason
  });
  
  // Apply changes
  Object.assign(this, changes);
  this.version += 1;
  this.updatedBy = userId;
  
  return this.save();
};

// Static methods
fraudRuleSchema.statics.getActiveRules = function(category = null) {
  const query = { isActive: true };
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('createdBy', 'name email');
};

fraudRuleSchema.statics.getRulesByEffectiveness = function(minEffectiveness = 0.7) {
  return this.find({
    isActive: true,
    'statistics.effectiveness': { $gte: minEffectiveness }
  })
  .sort({ 'statistics.effectiveness': -1, priority: -1 });
};

fraudRuleSchema.statics.searchRules = function(searchTerm, options = {}) {
  const query = {
    $text: { $search: searchTerm }
  };
  
  if (options.category) {
    query.category = options.category;
  }
  
  if (options.isActive !== undefined) {
    query.isActive = options.isActive;
  }
  
  return this.find(query, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' }, priority: -1 });
};

fraudRuleSchema.statics.getRulesStatistics = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        'statistics.lastTriggered': {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$category',
        totalRules: { $sum: 1 },
        totalTriggers: { $sum: '$statistics.triggeredCount' },
        avgEffectiveness: { $avg: '$statistics.effectiveness' },
        truePositives: { $sum: '$statistics.truePositives' },
        falsePositives: { $sum: '$statistics.falsePositives' }
      }
    }
  ]);
};

// Pre-save middleware
fraudRuleSchema.pre('save', function(next) {
  if (this.isModified('conditions') || this.isModified('actions')) {
    this.version += 1;
  }
  next();
});

// Post-save middleware
fraudRuleSchema.post('save', function(doc) {
  if (doc.isNew) {
    console.log(`New fraud rule created: ${doc.name} (${doc.ruleId})`);
  }
});

module.exports = mongoose.model('FraudRule', fraudRuleSchema);