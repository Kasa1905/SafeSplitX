const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MongoUser: User } = require('../models/User');

const signToken = (user) => {
  const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only';
  return jwt.sign(
    { userId: user._id.toString(), role: user.role || 'user' },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
};

const safeUser = (user) => {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.password;
  delete obj.__v;
  return obj;
};

const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body || {};

    // Basic safeguards (validators already run, but ensure clear messages for tests)
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, error: 'Validation failed' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }

    const user = await User.create({ email, password, firstName, lastName, phone });
    const token = signToken(user);
    return res.status(201).json({ success: true, data: { user: safeUser(user), token } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = signToken(user);
    return res.status(200).json({ success: true, data: { user: safeUser(user), token } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const refreshToken = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};

const logout = async (req, res) => {
  // Stateless JWT: nothing to invalidate here; respond success in all cases
  return res.status(200).json({ success: true, data: { message: 'Logged out successfully' } });
};

const forgotPassword = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};

const resetPassword = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Validation failed' });
    }
    if (String(newPassword).length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters' });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();
    return res.status(200).json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.status(200).json({ success: true, data: { user: safeUser(user) } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user && req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Access token required' });
    }

    const disallowed = ['email'];
    for (const k of disallowed) {
      if (k in (req.body || {})) {
        return res.status(400).json({ success: false, error: 'Email cannot be updated through this endpoint' });
      }
    }

    const updates = {};
    ['firstName', 'lastName', 'phone'].forEach((f) => {
      if (req.body && req.body[f] !== undefined) updates[f] = req.body[f];
    });

    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    return res.status(200).json({ success: true, data: { user: safeUser(user) } });
  } catch (e) {
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const verifyEmail = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};

const resendVerification = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};

const deleteAccount = async (req, res) => {
  return res.status(501).json({ success: false, error: 'Not implemented' });
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  getCurrentUser,
  updateProfile,
  verifyEmail,
  resendVerification,
  deleteAccount
};