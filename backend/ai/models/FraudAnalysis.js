const mongoose = require('mongoose');

const fraudAnalysisSchema = new mongoose.Schema({
  // Reference to the analyzed expense
  expenseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
    required: false, // May be null for bulk analysis
    index: true
  },

  // User and group context
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

  // Core fraud detection results
  fraudScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    index: true
  },

  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },

  riskLevel: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH'],
    index: true
  },

  // Analysis components used
  analysisComponents: [{
    type: String,
    enum: ['ml', 'rule', 'fallback']
  }],

  // ML analysis results
  mlAnalysis: {
    fraudScore: Number,
    confidence: Number,
    riskLevel: String,
    modelVersion: String,
    anomalyScore: Number,
    features: mongoose.Schema.Types.Mixed,
    featureImportance: [mongoose.Schema.Types.Mixed],
    explanation: String,
    patterns: [String],
    processingTime: Number
  },

  // Rule engine analysis results
  ruleAnalysis: {
    fraudScore: Number,
    riskLevel: String,
    triggeredRules: [{
      id: String,
      name: String,
      severity: String,
      weight: Number,
      score: Number,
      explanation: String,
      metadata: mongoose.Schema.Types.Mixed
    }],
    ruleAnalysis: [mongoose.Schema.Types.Mixed],
    processingTime: Number,
    totalRulesEvaluated: Number
  },

  // Human-readable explanation
  explanation: {
    type: String,
    required: true
  },

  // Action flags
  requiresReview: {
    type: Boolean,
    default: false,
    index: true
  },

  requiresAlert: {
    type: Boolean,
    default: false,
    index: true
  },

  autoFlag: {
    type: Boolean,
    default: false,
    index: true
  },

  // Performance metrics
  processingTime: {
    type: Number,
    required: false // milliseconds
  },

  // Context information
  contextData: {
    userHistoryCount: Number,
    groupHistoryCount: Number,
    timeWindow: String,
    error: String
  },

  // Review and resolution tracking
  reviewStatus: {
    type: String,
    enum: ['PENDING', 'REVIEWED', 'DISMISSED'],
    default: 'PENDING',
    index: true
  },

  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  reviewedAt: {
    type: Date,
    required: false
  },

  reviewNotes: {
    type: String,
    required: false
  },

  // True/false positive classification for model improvement
  classification: {
    type: String,
    enum: ['TRUE_POSITIVE', 'FALSE_POSITIVE', 'TRUE_NEGATIVE', 'FALSE_NEGATIVE'],
    required: false,
    index: true
  },

  classifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  classifiedAt: {
    type: Date,
    required: false
  },

  // Versioning for model tracking
  version: {
    type: String,
    required: true,
    default: '1.0.0'
  },

  // Metadata for debugging and analysis
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }
}, {
  timestamps: true, // Adds createdAt and updatedAt
  collection: 'fraud_analyses'
});

// Indexes for performance
fraudAnalysisSchema.index({ createdAt: -1 });
fraudAnalysisSchema.index({ userId: 1, createdAt: -1 });
fraudAnalysisSchema.index({ groupId: 1, createdAt: -1 });
fraudAnalysisSchema.index({ fraudScore: -1, createdAt: -1 });
fraudAnalysisSchema.index({ riskLevel: 1, reviewStatus: 1 });
fraudAnalysisSchema.index({ requiresAlert: 1, createdAt: -1 });
fraudAnalysisSchema.index({ expenseId: 1, createdAt: -1 });

// Compound indexes for common queries
fraudAnalysisSchema.index({ userId: 1, fraudScore: -1, createdAt: -1 });
fraudAnalysisSchema.index({ riskLevel: 1, requiresReview: 1, reviewStatus: 1 });

// TTL index for data retention (optional)
fraudAnalysisSchema.index(
  { createdAt: 1 }, 
  { 
    expireAfterSeconds: 365 * 24 * 60 * 60, // 1 year
    partialFilterExpression: { riskLevel: 'LOW', reviewStatus: 'REVIEWED' }
  }
);

// Virtual for easy access to expense data
fraudAnalysisSchema.virtual('expense', {
  ref: 'Expense',
  localField: 'expenseId',
  foreignField: '_id',
  justOne: true
});

fraudAnalysisSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

fraudAnalysisSchema.virtual('group', {
  ref: 'Group',
  localField: 'groupId',
  foreignField: '_id',
  justOne: true
});

// Instance methods
fraudAnalysisSchema.methods.markAsReviewed = function(reviewerId, notes = '') {
  this.reviewStatus = 'REVIEWED';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  return this.save();
};

fraudAnalysisSchema.methods.classify = function(classification, userId) {
  this.classification = classification;
  this.classifiedBy = userId;
  this.classifiedAt = new Date();
  return this.save();
};

fraudAnalysisSchema.methods.dismiss = function(reviewerId, reason = '') {
  this.reviewStatus = 'DISMISSED';
  this.reviewedBy = reviewerId;
  this.reviewedAt = new Date();
  this.reviewNotes = reason;
  return this.save();
};

// Static methods
fraudAnalysisSchema.statics.getHighRiskAnalyses = function(limit = 50) {
  return this.find({ riskLevel: 'HIGH', reviewStatus: 'PENDING' })
    .sort({ fraudScore: -1, createdAt: -1 })
    .limit(limit)
    .populate('expense user group');
};

fraudAnalysisSchema.statics.getAnalyticsSummary = function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$riskLevel',
        count: { $sum: 1 },
        avgScore: { $avg: '$fraudScore' },
        maxScore: { $max: '$fraudScore' },
        reviewedCount: {
          $sum: { $cond: [{ $eq: ['$reviewStatus', 'REVIEWED'] }, 1, 0] }
        },
        alertCount: {
          $sum: { $cond: ['$requiresAlert', 1, 0] }
        }
      }
    }
  ]);
};

fraudAnalysisSchema.statics.getUserRiskProfile = function(userId, days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        avgFraudScore: { $avg: '$fraudScore' },
        maxFraudScore: { $max: '$fraudScore' },
        highRiskCount: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'HIGH'] }, 1, 0] }
        },
        flaggedCount: {
          $sum: { $cond: ['$autoFlag', 1, 0] }
        },
        recentScores: { $push: '$fraudScore' }
      }
    }
  ]);
};

fraudAnalysisSchema.statics.getModelPerformance = function(days = 30) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        classification: { $exists: true }
      }
    },
    {
      $group: {
        _id: '$classification',
        count: { $sum: 1 },
        avgScore: { $avg: '$fraudScore' },
        avgProcessingTime: { $avg: '$processingTime' }
      }
    }
  ]);
};

// Pre-save middleware
fraudAnalysisSchema.pre('save', function(next) {
  // Validate fraud score is within bounds
  if (this.fraudScore < 0) this.fraudScore = 0;
  if (this.fraudScore > 1) this.fraudScore = 1;
  
  // Validate confidence is within bounds
  if (this.confidence < 0) this.confidence = 0;
  if (this.confidence > 1) this.confidence = 1;
  
  // Auto-set review requirements based on score thresholds
  if (this.fraudScore >= 0.8) {
    this.requiresAlert = true;
  }
  if (this.fraudScore >= 0.6) {
    this.requiresReview = true;
  }
  if (this.fraudScore >= 0.9) {
    this.autoFlag = true;
  }
  
  next();
});

// Post-save middleware for logging
fraudAnalysisSchema.post('save', function(doc) {
  if (doc.requiresAlert && doc.isNew) {
    console.log(`High-risk fraud analysis created: ${doc._id} (Score: ${doc.fraudScore})`);
  }
});

module.exports = mongoose.model('FraudAnalysis', fraudAnalysisSchema);