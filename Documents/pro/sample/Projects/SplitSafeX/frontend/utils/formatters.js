// Currency formatting utilities
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (amount === null || amount === undefined) {
    return '$0.00';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback for unsupported currencies or locales
    return `$${parseFloat(amount).toFixed(2)}`;
  }
}

// Date formatting utilities
export function formatDate(date, format = 'short') {
  if (!date) return '';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return '';

  const now = new Date();
  const diffInMs = now - dateObj;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  // Relative time for recent dates
  if (format === 'relative') {
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  }

  // Standard formatting
  const options = {
    short: { month: 'short', day: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    },
    time: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    },
    datetime: {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
  };

  try {
    return dateObj.toLocaleDateString('en-US', options[format] || options.medium);
  } catch (error) {
    return dateObj.toLocaleDateString();
  }
}

export function formatDateTime(date) {
  return formatDate(date, 'datetime');
}

export function formatTime(date) {
  return formatDate(date, 'time');
}

// Number formatting utilities
export function formatNumber(num, options = {}) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }

  const {
    decimals = 0,
    suffix = '',
    prefix = '',
    compact = false
  } = options;

  if (compact && Math.abs(num) >= 1000) {
    const units = ['', 'K', 'M', 'B', 'T'];
    let unitIndex = 0;
    let value = Math.abs(num);

    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }

    const formattedValue = value.toFixed(value < 10 ? 1 : 0);
    return `${prefix}${num < 0 ? '-' : ''}${formattedValue}${units[unitIndex]}${suffix}`;
  }

  return `${prefix}${num.toFixed(decimals)}${suffix}`;
}

export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  return `${(value * 100).toFixed(decimals)}%`;
}

// Text formatting utilities
export function truncateText(text, maxLength = 50) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function capitalizeWords(str) {
  if (!str) return '';
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return '';
  
  // Remove all non-numeric characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a valid US phone number
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  // Return original if not valid
  return phoneNumber;
}

// File size formatting
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// URL formatting
export function formatUrl(url) {
  if (!url) return '';
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Split amount formatting
export function formatSplitAmount(total, participants) {
  if (!total || !participants || participants.length === 0) {
    return formatCurrency(0);
  }
  
  const splitAmount = total / participants.length;
  return formatCurrency(splitAmount);
}

// Balance formatting with color indication
export function formatBalance(balance) {
  const formatted = formatCurrency(Math.abs(balance));
  const sign = balance > 0 ? '+' : balance < 0 ? '-' : '';
  return `${sign}${formatted}`;
}

// Export all formatters as default object
export default {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber,
  formatPercentage,
  truncateText,
  capitalizeFirst,
  capitalizeWords,
  formatPhoneNumber,
  formatFileSize,
  formatUrl,
  formatSplitAmount,
  formatBalance
};