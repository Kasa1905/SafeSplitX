// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'SplitSafeX',
  VERSION: '1.0.0',
  DESCRIPTION: 'Smart expense splitting with fraud detection',
  SUPPORT_EMAIL: 'support@splitsafex.com',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  SUPPORTED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
};

// Expense Categories
export const EXPENSE_CATEGORIES = [
  { 
    value: 'food', 
    label: 'Food & Dining', 
    icon: '🍽️',
    color: '#f59e0b',
    description: 'Restaurants, groceries, takeout'
  },
  { 
    value: 'transportation', 
    label: 'Transportation', 
    icon: '🚗',
    color: '#3b82f6',
    description: 'Uber, taxi, gas, parking'
  },
  { 
    value: 'entertainment', 
    label: 'Entertainment', 
    icon: '🎬',
    color: '#8b5cf6',
    description: 'Movies, concerts, games'
  },
  { 
    value: 'utilities', 
    label: 'Utilities', 
    icon: '⚡',
    color: '#10b981',
    description: 'Electric, water, internet'
  },
  { 
    value: 'shopping', 
    label: 'Shopping', 
    icon: '🛍️',
    color: '#ef4444',
    description: 'Clothes, electronics, misc'
  },
  { 
    value: 'travel', 
    label: 'Travel', 
    icon: '✈️',
    color: '#06b6d4',
    description: 'Hotels, flights, vacation'
  },
  { 
    value: 'healthcare', 
    label: 'Healthcare', 
    icon: '🏥',
    color: '#ec4899',
    description: 'Medical, pharmacy, insurance'
  },
  { 
    value: 'education', 
    label: 'Education', 
    icon: '📚',
    color: '#f97316',
    description: 'Books, courses, supplies'
  },
  { 
    value: 'other', 
    label: 'Other', 
    icon: '💰',
    color: '#6b7280',
    description: 'Miscellaneous expenses'
  }
];

// Payment Methods
export const PAYMENT_METHODS = [
  { 
    value: 'cash', 
    label: 'Cash', 
    icon: '💵',
    requiresDetails: false
  },
  { 
    value: 'venmo', 
    label: 'Venmo', 
    icon: '📱',
    requiresDetails: true,
    placeholder: '@username'
  },
  { 
    value: 'paypal', 
    label: 'PayPal', 
    icon: '💙',
    requiresDetails: true,
    placeholder: 'email@example.com'
  },
  { 
    value: 'zelle', 
    label: 'Zelle', 
    icon: '🏦',
    requiresDetails: true,
    placeholder: 'Phone or email'
  },
  { 
    value: 'bank_transfer', 
    label: 'Bank Transfer', 
    icon: '🏛️',
    requiresDetails: true,
    placeholder: 'Account details'
  },
  { 
    value: 'credit_card', 
    label: 'Credit Card', 
    icon: '💳',
    requiresDetails: true,
    placeholder: 'Last 4 digits'
  },
  { 
    value: 'crypto', 
    label: 'Cryptocurrency', 
    icon: '₿',
    requiresDetails: true,
    placeholder: 'Wallet address'
  }
];

// Split Types
export const SPLIT_TYPES = [
  {
    value: 'equal',
    label: 'Equal Split',
    description: 'Split equally among all participants',
    icon: '⚖️'
  },
  {
    value: 'percentage',
    label: 'Percentage Split',
    description: 'Split by custom percentages',
    icon: '📊'
  },
  {
    value: 'custom',
    label: 'Custom Amount',
    description: 'Specify exact amounts for each person',
    icon: '💰'
  },
  {
    value: 'shares',
    label: 'By Shares',
    description: 'Split based on number of shares per person',
    icon: '🔢'
  }
];

// User Roles
export const USER_ROLES = {
  CREATOR: 'creator',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest'
};

export const USER_ROLE_LABELS = {
  [USER_ROLES.CREATOR]: 'Creator',
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.MEMBER]: 'Member',
  [USER_ROLES.GUEST]: 'Guest'
};

// Settlement Status
export const SETTLEMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled'
};

export const SETTLEMENT_STATUS_LABELS = {
  [SETTLEMENT_STATUS.PENDING]: 'Pending',
  [SETTLEMENT_STATUS.COMPLETED]: 'Completed',
  [SETTLEMENT_STATUS.REJECTED]: 'Rejected',
  [SETTLEMENT_STATUS.CANCELLED]: 'Cancelled'
};

export const SETTLEMENT_STATUS_COLORS = {
  [SETTLEMENT_STATUS.PENDING]: 'yellow',
  [SETTLEMENT_STATUS.COMPLETED]: 'green',
  [SETTLEMENT_STATUS.REJECTED]: 'red',
  [SETTLEMENT_STATUS.CANCELLED]: 'gray'
};

// Expense Status
export const EXPENSE_STATUS = {
  PENDING: 'pending',
  SETTLED: 'settled',
  PARTIALLY_SETTLED: 'partially_settled'
};

export const EXPENSE_STATUS_LABELS = {
  [EXPENSE_STATUS.PENDING]: 'Pending',
  [EXPENSE_STATUS.SETTLED]: 'Settled',
  [EXPENSE_STATUS.PARTIALLY_SETTLED]: 'Partially Settled'
};

// Fraud Detection
export const FRAUD_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

export const FRAUD_SEVERITY_LABELS = {
  [FRAUD_SEVERITY.LOW]: 'Low Risk',
  [FRAUD_SEVERITY.MEDIUM]: 'Medium Risk',
  [FRAUD_SEVERITY.HIGH]: 'High Risk',
  [FRAUD_SEVERITY.CRITICAL]: 'Critical Risk'
};

export const FRAUD_SEVERITY_COLORS = {
  [FRAUD_SEVERITY.LOW]: 'green',
  [FRAUD_SEVERITY.MEDIUM]: 'yellow',
  [FRAUD_SEVERITY.HIGH]: 'orange',
  [FRAUD_SEVERITY.CRITICAL]: 'red'
};

export const FRAUD_THRESHOLDS = {
  LOW: 0.3,
  MEDIUM: 0.5,
  HIGH: 0.7,
  CRITICAL: 0.9
};

// Date Ranges for Analytics
export const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' }
];

// Theme Options
export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'system', label: 'System', icon: '💻' }
];

// Currency Options
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { value: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { value: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { value: 'CNY', label: 'Chinese Yuan', symbol: '¥' }
];

// Notification Types
export const NOTIFICATION_TYPES = {
  EXPENSE_ADDED: 'expense_added',
  EXPENSE_SETTLED: 'expense_settled',
  SETTLEMENT_REQUEST: 'settlement_request',
  SETTLEMENT_COMPLETED: 'settlement_completed',
  GROUP_INVITATION: 'group_invitation',
  FRAUD_ALERT: 'fraud_alert',
  REMINDER: 'reminder'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_PREFERENCES: 'user_preferences',
  THEME: 'theme',
  CURRENCY: 'currency',
  FRAUD_THRESHOLD: 'fraud_threshold',
  RECENT_SEARCHES: 'recent_searches',
  ONBOARDING_COMPLETED: 'onboarding_completed'
};

// Pagination
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};

// Chart Colors
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1'  // indigo
];

// Social Media Links
export const SOCIAL_LINKS = {
  TWITTER: 'https://twitter.com/splitsafex',
  FACEBOOK: 'https://facebook.com/splitsafex',
  INSTAGRAM: 'https://instagram.com/splitsafex',
  LINKEDIN: 'https://linkedin.com/company/splitsafex'
};

// Feature Flags (for development/rollout control)
export const FEATURE_FLAGS = {
  ENABLE_FRAUD_DETECTION: true,
  ENABLE_RECEIPT_SCANNING: true,
  ENABLE_CRYPTOCURRENCY: false,
  ENABLE_GROUP_ANALYTICS: true,
  ENABLE_BULK_OPERATIONS: true,
  ENABLE_EXPORT_DATA: true,
  ENABLE_DARK_MODE: true
};

// Regular Expressions
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  CURRENCY: /^\d+(\.\d{1,2})?$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  URL: /^https?:\/\/([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  NOT_FOUND: 'The requested resource was not found.',
  TIMEOUT: 'Request timed out. Please try again.',
  FILE_TOO_LARGE: 'File size exceeds the maximum limit.',
  INVALID_FILE_TYPE: 'File type is not supported.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  EXPENSE_CREATED: 'Expense created successfully!',
  EXPENSE_UPDATED: 'Expense updated successfully!',
  EXPENSE_DELETED: 'Expense deleted successfully!',
  GROUP_CREATED: 'Group created successfully!',
  GROUP_UPDATED: 'Group updated successfully!',
  MEMBER_ADDED: 'Member added to group successfully!',
  SETTLEMENT_CREATED: 'Settlement request sent successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!'
};

export default {
  API_CONFIG,
  APP_CONFIG,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  SPLIT_TYPES,
  USER_ROLES,
  USER_ROLE_LABELS,
  SETTLEMENT_STATUS,
  SETTLEMENT_STATUS_LABELS,
  SETTLEMENT_STATUS_COLORS,
  EXPENSE_STATUS,
  EXPENSE_STATUS_LABELS,
  FRAUD_SEVERITY,
  FRAUD_SEVERITY_LABELS,
  FRAUD_SEVERITY_COLORS,
  FRAUD_THRESHOLDS,
  DATE_RANGES,
  THEME_OPTIONS,
  CURRENCY_OPTIONS,
  NOTIFICATION_TYPES,
  STORAGE_KEYS,
  PAGINATION_DEFAULTS,
  CHART_COLORS,
  SOCIAL_LINKS,
  FEATURE_FLAGS,
  REGEX_PATTERNS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES
};