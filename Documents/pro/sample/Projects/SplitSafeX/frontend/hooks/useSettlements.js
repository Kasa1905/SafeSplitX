import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

// Mock settlements data - replace with actual API calls
const mockSettlements = [
  {
    id: 'settlement-1',
    fromUserId: 'user-2',
    fromUserName: 'Jane Smith',
    toUserId: 'user-1',
    toUserName: 'John Doe',
    amount: 22.50,
    groupId: 'group-1',
    groupName: 'Weekend Trip',
    status: 'pending',
    method: 'venmo',
    note: 'For the Uber ride',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    dueDate: '2024-01-23T10:00:00Z'
  },
  {
    id: 'settlement-2',
    fromUserId: 'user-1',
    fromUserName: 'John Doe',
    toUserId: 'user-4',
    toUserName: 'Alice Cooper',
    amount: 50.00,
    groupId: 'group-2',
    groupName: 'House Expenses',
    status: 'completed',
    method: 'bank_transfer',
    note: 'Monthly rent contribution',
    createdAt: '2024-01-12T15:00:00Z',
    updatedAt: '2024-01-12T18:30:00Z',
    completedAt: '2024-01-12T18:30:00Z',
    dueDate: '2024-01-19T15:00:00Z'
  }
];

export function useSettlements(groupId = null) {
  const { user } = useAuth();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSettlements();
  }, [groupId, user]);

  const fetchSettlements = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Filter settlements by group if specified and by user involvement
      let filteredSettlements = mockSettlements.filter(settlement => 
        settlement.fromUserId === user.id || settlement.toUserId === user.id
      );
      
      if (groupId) {
        filteredSettlements = filteredSettlements.filter(settlement => 
          settlement.groupId === groupId
        );
      }
      
      setSettlements(filteredSettlements);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createSettlement = async (settlementData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newSettlement = {
        id: 'settlement-' + Date.now(),
        ...settlementData,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      };
      
      setSettlements(prev => [newSettlement, ...prev]);
      return { success: true, settlement: newSettlement };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateSettlement = async (settlementId, updates) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSettlements(prev =>
        prev.map(settlement =>
          settlement.id === settlementId
            ? { ...settlement, ...updates, updatedAt: new Date().toISOString() }
            : settlement
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

  const approveSettlement = async (settlementId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const updates = {
        status: 'completed',
        completedAt: new Date().toISOString()
      };
      
      setSettlements(prev =>
        prev.map(settlement =>
          settlement.id === settlementId
            ? { ...settlement, ...updates, updatedAt: new Date().toISOString() }
            : settlement
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

  const rejectSettlement = async (settlementId, reason) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const updates = {
        status: 'rejected',
        rejectionReason: reason
      };
      
      setSettlements(prev =>
        prev.map(settlement =>
          settlement.id === settlementId
            ? { ...settlement, ...updates, updatedAt: new Date().toISOString() }
            : settlement
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

  const cancelSettlement = async (settlementId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updates = {
        status: 'cancelled'
      };
      
      setSettlements(prev =>
        prev.map(settlement =>
          settlement.id === settlementId
            ? { ...settlement, ...updates, updatedAt: new Date().toISOString() }
            : settlement
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

  const deleteSettlement = async (settlementId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setSettlements(prev => prev.filter(settlement => settlement.id !== settlementId));
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getSettlementById = (settlementId) => {
    return settlements.find(settlement => settlement.id === settlementId);
  };

  const getPendingSettlements = () => {
    return settlements.filter(settlement => settlement.status === 'pending');
  };

  const getCompletedSettlements = () => {
    return settlements.filter(settlement => settlement.status === 'completed');
  };

  const getOwedToUser = () => {
    return settlements
      .filter(settlement => settlement.toUserId === user.id && settlement.status === 'pending')
      .reduce((total, settlement) => total + settlement.amount, 0);
  };

  const getOwedByUser = () => {
    return settlements
      .filter(settlement => settlement.fromUserId === user.id && settlement.status === 'pending')
      .reduce((total, settlement) => total + settlement.amount, 0);
  };

  const getOverdueSettlements = () => {
    const now = new Date();
    return settlements.filter(settlement => 
      settlement.status === 'pending' && 
      settlement.dueDate && 
      new Date(settlement.dueDate) < now
    );
  };

  const getTotalSettled = () => {
    return settlements
      .filter(settlement => settlement.status === 'completed')
      .reduce((total, settlement) => {
        if (settlement.fromUserId === user.id) {
          return total - settlement.amount; // User paid out
        } else if (settlement.toUserId === user.id) {
          return total + settlement.amount; // User received
        }
        return total;
      }, 0);
  };

  const getSettlementsByGroup = (specificGroupId) => {
    return settlements.filter(settlement => settlement.groupId === specificGroupId);
  };

  const remindSettlement = async (settlementId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In real implementation, this would send a notification/reminder
      const updates = {
        lastReminded: new Date().toISOString()
      };
      
      setSettlements(prev =>
        prev.map(settlement =>
          settlement.id === settlementId
            ? { ...settlement, ...updates, updatedAt: new Date().toISOString() }
            : settlement
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

  return {
    settlements,
    loading,
    error,
    createSettlement,
    updateSettlement,
    approveSettlement,
    rejectSettlement,
    cancelSettlement,
    deleteSettlement,
    remindSettlement,
    getSettlementById,
    getPendingSettlements,
    getCompletedSettlements,
    getOwedToUser,
    getOwedByUser,
    getOverdueSettlements,
    getTotalSettled,
    getSettlementsByGroup,
    refetch: fetchSettlements
  };
}