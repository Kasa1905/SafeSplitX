// Email validation
export function isValidEmail(email) {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

// Password validation
export function validatePassword(password) {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: getPasswordStrength(password)
  };
}

function getPasswordStrength(password) {
  let score = 0;
  
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
}

// Name validation
export function validateName(name) {
  const errors = [];
  
  if (!name || !name.trim()) {
    errors.push('Name is required');
    return { isValid: false, errors };
  }

  if (name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }

  if (name.trim().length > 50) {
    errors.push('Name must be less than 50 characters');
  }

  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) {
    errors.push('Name can only contain letters, spaces, hyphens, and apostrophes');
  }

  return { isValid: errors.length === 0, errors };
}

// Phone number validation
export function validatePhone(phone) {
  const errors = [];
  
  if (!phone) {
    return { isValid: true, errors }; // Phone is optional
  }

  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    errors.push('Phone number must be 10 digits');
  }

  return { isValid: errors.length === 0, errors };
}

// Expense validation
export function validateExpense(expense) {
  const errors = [];

  if (!expense.description || !expense.description.trim()) {
    errors.push('Description is required');
  } else if (expense.description.trim().length > 100) {
    errors.push('Description must be less than 100 characters');
  }

  if (!expense.amount) {
    errors.push('Amount is required');
  } else {
    const amount = parseFloat(expense.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Amount must be a positive number');
    } else if (amount > 999999.99) {
      errors.push('Amount must be less than $1,000,000');
    }
  }

  if (!expense.category) {
    errors.push('Category is required');
  }

  if (!expense.date) {
    errors.push('Date is required');
  } else {
    const date = new Date(expense.date);
    const today = new Date();
    const maxPastDate = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate());
    
    if (isNaN(date.getTime())) {
      errors.push('Invalid date');
    } else if (date > today) {
      errors.push('Date cannot be in the future');
    } else if (date < maxPastDate) {
      errors.push('Date cannot be more than 5 years in the past');
    }
  }

  // Validate participants if it's a group expense
  if (expense.groupId && expense.participants) {
    if (expense.participants.length === 0) {
      errors.push('At least one participant is required');
    }

    // Validate custom splits if specified
    if (expense.splitType === 'custom' && expense.customSplits) {
      const totalCustomSplit = Object.values(expense.customSplits).reduce((sum, amount) => sum + (parseFloat(amount) || 0), 0);
      const expenseAmount = parseFloat(expense.amount) || 0;
      
      if (Math.abs(totalCustomSplit - expenseAmount) > 0.01) {
        errors.push('Custom split amounts must equal the total expense amount');
      }

      // Check that all participants have split amounts
      expense.participants.forEach(participantId => {
        if (!expense.customSplits[participantId] || parseFloat(expense.customSplits[participantId]) <= 0) {
          errors.push('All participants must have a positive split amount');
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
}

// Group validation
export function validateGroup(group) {
  const errors = [];

  if (!group.name || !group.name.trim()) {
    errors.push('Group name is required');
  } else if (group.name.trim().length < 3) {
    errors.push('Group name must be at least 3 characters long');
  } else if (group.name.trim().length > 50) {
    errors.push('Group name must be less than 50 characters');
  }

  if (group.description && group.description.length > 200) {
    errors.push('Description must be less than 200 characters');
  }

  return { isValid: errors.length === 0, errors };
}

// Member validation (for adding to groups)
export function validateMember(member) {
  const errors = [];

  const nameValidation = validateName(member.name);
  if (!nameValidation.isValid) {
    errors.push(...nameValidation.errors);
  }

  const emailValidation = validateEmail(member.email);
  if (!emailValidation) {
    errors.push('Valid email is required');
  }

  const phoneValidation = validatePhone(member.phone);
  if (!phoneValidation.isValid) {
    errors.push(...phoneValidation.errors);
  }

  return { isValid: errors.length === 0, errors };
}

// Settlement validation
export function validateSettlement(settlement) {
  const errors = [];

  if (!settlement.amount) {
    errors.push('Amount is required');
  } else {
    const amount = parseFloat(settlement.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push('Amount must be a positive number');
    } else if (amount > 999999.99) {
      errors.push('Amount must be less than $1,000,000');
    }
  }

  if (!settlement.fromUserId) {
    errors.push('Payer is required');
  }

  if (!settlement.toUserId) {
    errors.push('Recipient is required');
  }

  if (settlement.fromUserId === settlement.toUserId) {
    errors.push('Payer and recipient cannot be the same person');
  }

  if (!settlement.method) {
    errors.push('Payment method is required');
  }

  if (settlement.note && settlement.note.length > 200) {
    errors.push('Note must be less than 200 characters');
  }

  return { isValid: errors.length === 0, errors };
}

// File validation
export function validateFile(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    required = false
  } = options;

  const errors = [];

  if (!file) {
    if (required) {
      errors.push('File is required');
    }
    return { isValid: !required, errors };
  }

  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type not supported. Allowed types: ${allowedTypes.join(', ')}`);
  }

  return { isValid: errors.length === 0, errors };
}

// URL validation
export function validateUrl(url, required = false) {
  const errors = [];

  if (!url) {
    if (required) {
      errors.push('URL is required');
    }
    return { isValid: !required, errors };
  }

  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    errors.push('Invalid URL format');
  }

  return { isValid: errors.length === 0, errors };
}

// Generic form validation
export function validateForm(data, rules) {
  const errors = {};
  let isValid = true;

  Object.keys(rules).forEach(field => {
    const rule = rules[field];
    const value = data[field];
    const fieldErrors = [];

    // Required validation
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      fieldErrors.push(`${rule.label || field} is required`);
    }

    // Skip other validations if field is empty and not required
    if (!value && !rule.required) {
      return;
    }

    // Custom validation function
    if (rule.validate && typeof rule.validate === 'function') {
      const customResult = rule.validate(value, data);
      if (!customResult.isValid) {
        fieldErrors.push(...customResult.errors);
      }
    }

    // Built-in validations
    if (rule.type === 'email' && !isValidEmail(value)) {
      fieldErrors.push('Invalid email format');
    }

    if (rule.minLength && value.length < rule.minLength) {
      fieldErrors.push(`${rule.label || field} must be at least ${rule.minLength} characters`);
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      fieldErrors.push(`${rule.label || field} must be less than ${rule.maxLength} characters`);
    }

    if (rule.min && parseFloat(value) < rule.min) {
      fieldErrors.push(`${rule.label || field} must be at least ${rule.min}`);
    }

    if (rule.max && parseFloat(value) > rule.max) {
      fieldErrors.push(`${rule.label || field} must be no more than ${rule.max}`);
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      fieldErrors.push(rule.patternMessage || `${rule.label || field} format is invalid`);
    }

    if (fieldErrors.length > 0) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  });

  return { isValid, errors };
}

// Export all validators
export default {
  isValidEmail,
  validatePassword,
  validateName,
  validatePhone,
  validateExpense,
  validateGroup,
  validateMember,
  validateSettlement,
  validateFile,
  validateUrl,
  validateForm
};