import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Mock user data - replace with actual API calls
  const mockUser = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    avatar: null,
    preferences: {
      theme: 'system',
      currency: 'USD',
      notifications: true
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Mock authentication check - replace with actual API call
      const token = localStorage.getItem('auth_token');
      
      if (token) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 500));
        setUser(mockUser);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      
      // Mock login API call - replace with actual implementation
      if (email === 'demo@example.com' && password === 'demo123') {
        const token = 'mock-jwt-token-' + Date.now();
        localStorage.setItem('auth_token', token);
        setUser(mockUser);
        return { success: true };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      
      // Mock registration API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newUser = {
        ...mockUser,
        id: 'user-' + Date.now(),
        name: userData.name,
        email: userData.email
      };
      
      const token = 'mock-jwt-token-' + Date.now();
      localStorage.setItem('auth_token', token);
      setUser(newUser);
      
      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Mock logout API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 300));
      
      localStorage.removeItem('auth_token');
      setUser(null);
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      
      // Mock profile update API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Profile update failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      setLoading(true);
      
      // Mock password reset API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return { success: true, message: 'Password reset email sent' };
    } catch (error) {
      console.error('Password reset failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      
      // Mock password change API call - replace with actual implementation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (currentPassword === 'demo123') {
        return { success: true, message: 'Password changed successfully' };
      } else {
        throw new Error('Current password is incorrect');
      }
    } catch (error) {
      console.error('Password change failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    initialized,
    login,
    register,
    logout,
    updateProfile,
    resetPassword,
    changePassword,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}