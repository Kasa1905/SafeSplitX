import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

// Mock data - replace with actual API calls
const mockExpenses = [
  {
    id: 'exp-1',
    description: 'Dinner at Italian Restaurant',
    amount: 85.50,
    category: 'food',
    date: '2024-01-15',
    groupId: 'group-1',
    groupName: 'Weekend Trip',
    createdBy: 'user-1',
    createdByName: 'John Doe',
    participants: ['user-1', 'user-2', 'user-3'],
    userShare: 28.50,
    status: 'pending',
    receipt: null,
    fraudScore: 0.2,
    splitType: 'equal',
    createdAt: '2024-01-15T19:30:00Z',
    updatedAt: '2024-01-15T19:30:00Z'
  },
  {
    id: 'exp-2',
    description: 'Uber to Airport',
    amount: 45.00,
    category: 'transportation',
    date: '2024-01-14',
    groupId: 'group-1',
    groupName: 'Weekend Trip',
    createdBy: 'user-2',
    createdByName: 'Jane Smith',
    participants: ['user-1', 'user-2'],
    userShare: 22.50,
    status: 'settled',
    receipt: 'receipt-2.pdf',
    fraudScore: 0.1,
    splitType: 'equal',
    createdAt: '2024-01-14T08:15:00Z',
    updatedAt: '2024-01-14T10:00:00Z'
  }
];

export function useExpenses(groupId = null) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExpenses();
  }, [groupId, user]);

  const fetchExpenses = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter expenses by group if specified
      let filteredExpenses = mockExpenses;
      if (groupId) {
        filteredExpenses = mockExpenses.filter(exp => exp.groupId === groupId);
      }
      
      setExpenses(filteredExpenses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = async (expenseData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newExpense = {
        id: 'exp-' + Date.now(),
        ...expenseData,
        createdBy: user.id,
        createdByName: user.name,
        status: 'pending',
        fraudScore: Math.random() * 0.5, // Mock fraud score
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setExpenses(prev => [newExpense, ...prev]);
      return { success: true, expense: newExpense };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateExpense = async (expenseId, updates) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setExpenses(prev =>
        prev.map(expense =>
          expense.id === expenseId
            ? { ...expense, ...updates, updatedAt: new Date().toISOString() }
            : expense
        )
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const deleteExpense = async (expenseId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const settleExpense = async (expenseId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setExpenses(prev =>
        prev.map(expense =>
          expense.id === expenseId
            ? { ...expense, status: 'settled', updatedAt: new Date().toISOString() }
            : expense
        )
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getExpenseById = (expenseId) => {
    return expenses.find(expense => expense.id === expenseId);
  };

  const getTotalExpenses = () => {
    return expenses.reduce((sum, expense) => sum + expense.amount, 0);
  };

  const getPendingExpenses = () => {
    return expenses.filter(expense => expense.status === 'pending');
  };

  const getExpensesByCategory = () => {
    return expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = [];
      }
      acc[expense.category].push(expense);
      return acc;
    }, {});
  };

  const getFraudulentExpenses = () => {
    return expenses.filter(expense => expense.fraudScore > 0.7);
  };

  const getUserBalance = () => {
    return expenses.reduce((balance, expense) => {
      if (expense.createdBy === user.id) {
        // User paid for the expense, they should get money back
        return balance + (expense.amount - expense.userShare);
      } else {
        // User owes money for this expense
        return balance - expense.userShare;
      }
    }, 0);
  };

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    settleExpense,
    getExpenseById,
    getTotalExpenses,
    getPendingExpenses,
    getExpensesByCategory,
    getFraudulentExpenses,
    getUserBalance,
    refetch: fetchExpenses
  };
}