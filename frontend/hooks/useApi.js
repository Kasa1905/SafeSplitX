import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };

  const handleResponse = async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  };

  const apiCall = useCallback(async (endpoint, options = {}) => {
    try {
      setLoading(true);
      setError(null);

      const config = {
        headers: getAuthHeaders(),
        ...options,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await handleResponse(response);

      return { success: true, data };
    } catch (err) {
      setError(err.message);
      console.error('API call failed:', err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth endpoints
  const auth = {
    login: (credentials) => apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
    register: (userData) => apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),
    logout: () => apiCall('/auth/logout', { method: 'POST' }),
    resetPassword: (email) => apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    }),
    changePassword: (passwords) => apiCall('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords)
    }),
    verifyToken: () => apiCall('/auth/verify')
  };

  // User endpoints
  const users = {
    getProfile: () => apiCall('/users/profile'),
    updateProfile: (updates) => apiCall('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
    uploadAvatar: (formData) => apiCall('/users/avatar', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    }),
    getPreferences: () => apiCall('/users/preferences'),
    updatePreferences: (preferences) => apiCall('/users/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences)
    })
  };

  // Expense endpoints
  const expenses = {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`/expenses${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => apiCall(`/expenses/${id}`),
    create: (expenseData) => apiCall('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    }),
    update: (id, updates) => apiCall(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
    delete: (id) => apiCall(`/expenses/${id}`, { method: 'DELETE' }),
    settle: (id) => apiCall(`/expenses/${id}/settle`, { method: 'POST' }),
    uploadReceipt: (id, formData) => apiCall(`/expenses/${id}/receipt`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      }
    }),
    analyze: (id) => apiCall(`/expenses/${id}/analyze`, { method: 'POST' })
  };

  // Group endpoints
  const groups = {
    getAll: () => apiCall('/groups'),
    getById: (id) => apiCall(`/groups/${id}`),
    create: (groupData) => apiCall('/groups', {
      method: 'POST',
      body: JSON.stringify(groupData)
    }),
    update: (id, updates) => apiCall(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
    delete: (id) => apiCall(`/groups/${id}`, { method: 'DELETE' }),
    join: (inviteCode) => apiCall('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode })
    }),
    leave: (id) => apiCall(`/groups/${id}/leave`, { method: 'POST' }),
    addMember: (id, memberData) => apiCall(`/groups/${id}/members`, {
      method: 'POST',
      body: JSON.stringify(memberData)
    }),
    removeMember: (id, memberId) => apiCall(`/groups/${id}/members/${memberId}`, {
      method: 'DELETE'
    }),
    updateMemberRole: (id, memberId, role) => apiCall(`/groups/${id}/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify({ role })
    }),
    getExpenses: (id, params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`/groups/${id}/expenses${queryString ? `?${queryString}` : ''}`);
    }
  };

  // Settlement endpoints
  const settlements = {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`/settlements${queryString ? `?${queryString}` : ''}`);
    },
    getById: (id) => apiCall(`/settlements/${id}`),
    create: (settlementData) => apiCall('/settlements', {
      method: 'POST',
      body: JSON.stringify(settlementData)
    }),
    update: (id, updates) => apiCall(`/settlements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    }),
    approve: (id) => apiCall(`/settlements/${id}/approve`, { method: 'POST' }),
    reject: (id, reason) => apiCall(`/settlements/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),
    cancel: (id) => apiCall(`/settlements/${id}/cancel`, { method: 'POST' }),
    delete: (id) => apiCall(`/settlements/${id}`, { method: 'DELETE' }),
    remind: (id) => apiCall(`/settlements/${id}/remind`, { method: 'POST' })
  };

  // Fraud detection endpoints
  const fraud = {
    getReports: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`/fraud/reports${queryString ? `?${queryString}` : ''}`);
    },
    getReportById: (id) => apiCall(`/fraud/reports/${id}`),
    analyzeExpense: (expenseId) => apiCall(`/fraud/analyze/${expenseId}`, {
      method: 'POST'
    }),
    reportFraud: (reportData) => apiCall('/fraud/report', {
      method: 'POST',
      body: JSON.stringify(reportData)
    }),
    investigateReport: (id, notes) => apiCall(`/fraud/reports/${id}/investigate`, {
      method: 'POST',
      body: JSON.stringify({ notes })
    }),
    resolveReport: (id, resolution) => apiCall(`/fraud/reports/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolution })
    }),
    dismissReport: (id, reason) => apiCall(`/fraud/reports/${id}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),
    bulkAnalyze: (expenseIds) => apiCall('/fraud/bulk-analyze', {
      method: 'POST',
      body: JSON.stringify({ expenseIds })
    }),
    updateThreshold: (threshold) => apiCall('/fraud/threshold', {
      method: 'PUT',
      body: JSON.stringify({ threshold })
    })
  };

  // Dashboard/Analytics endpoints
  const analytics = {
    getDashboard: () => apiCall('/analytics/dashboard'),
    getExpenseStats: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`/analytics/expenses${queryString ? `?${queryString}` : ''}`);
    },
    getGroupStats: (groupId) => apiCall(`/analytics/groups/${groupId}`),
    getCategoryBreakdown: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`/analytics/categories${queryString ? `?${queryString}` : ''}`);
    },
    getSpendingTrends: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`/analytics/trends${queryString ? `?${queryString}` : ''}`);
    }
  };

  // Notification endpoints
  const notifications = {
    getAll: (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return apiCall(`/notifications${queryString ? `?${queryString}` : ''}`);
    },
    markAsRead: (id) => apiCall(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllAsRead: () => apiCall('/notifications/read-all', { method: 'PUT' }),
    delete: (id) => apiCall(`/notifications/${id}`, { method: 'DELETE' }),
    updateSettings: (settings) => apiCall('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
  };

  return {
    loading,
    error,
    apiCall,
    auth,
    users,
    expenses,
    groups,
    settlements,
    fraud,
    analytics,
    notifications
  };
}