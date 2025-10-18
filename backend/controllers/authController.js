/**
 * Authentication Controller for SafeSplitX
 * Placeholder implementations returning 501 Not Implemented
 */

const { errorResponse } = require('../utils/response');

const notImplemented = (res, method) => {
  return errorResponse(
    res,
    `${method} endpoint not yet implemented`,
    'NOT_IMPLEMENTED',
    null,
    501
  );
};

const register = (req, res) => {
  return notImplemented(res, 'User registration');
};

const login = (req, res) => {
  return notImplemented(res, 'User login');
};

const refreshToken = (req, res) => {
  return notImplemented(res, 'Token refresh');
};

const logout = (req, res) => {
  return notImplemented(res, 'User logout');
};

const forgotPassword = (req, res) => {
  return notImplemented(res, 'Forgot password');
};

const resetPassword = (req, res) => {
  return notImplemented(res, 'Reset password');
};

const changePassword = (req, res) => {
  return notImplemented(res, 'Change password');
};

const getCurrentUser = (req, res) => {
  return notImplemented(res, 'Get current user');
};

const updateProfile = (req, res) => {
  return notImplemented(res, 'Update profile');
};

const verifyEmail = (req, res) => {
  return notImplemented(res, 'Verify email');
};

const resendVerification = (req, res) => {
  return notImplemented(res, 'Resend verification');
};

const deleteAccount = (req, res) => {
  return notImplemented(res, 'Delete account');
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