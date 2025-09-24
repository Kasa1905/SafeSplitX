import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

// Mock data - replace with actual API calls
const mockGroups = [
  {
    id: 'group-1',
    name: 'Weekend Trip',
    description: 'Our amazing weekend getaway',
    createdBy: 'user-1',
    members: [
      { id: 'user-1', name: 'John Doe', email: 'john@example.com', isAdmin: true, balance: 15.50, totalExpenses: 85.50 },
      { id: 'user-2', name: 'Jane Smith', email: 'jane@example.com', isAdmin: false, balance: -22.50, totalExpenses: 45.00 },
      { id: 'user-3', name: 'Bob Johnson', email: 'bob@example.com', isAdmin: false, balance: 7.00, totalExpenses: 0 }
    ],
    expenses: [],
    userBalance: 15.50,
    totalExpenses: 130.50,
    pendingExpenses: 1,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-15T19:30:00Z'
  },
  {
    id: 'group-2',
    name: 'House Expenses',
    description: 'Monthly household expenses',
    createdBy: 'user-1',
    members: [
      { id: 'user-1', name: 'John Doe', email: 'john@example.com', isAdmin: true, balance: -50.00, totalExpenses: 200.00 },
      { id: 'user-4', name: 'Alice Cooper', email: 'alice@example.com', isAdmin: false, balance: 50.00, totalExpenses: 150.00 }
    ],
    expenses: [],
    userBalance: -50.00,
    totalExpenses: 350.00,
    pendingExpenses: 0,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-12T15:20:00Z'
  }
];

export function useGroups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Filter groups where user is a member
      const userGroups = mockGroups.filter(group =>
        group.members.some(member => member.id === user.id)
      );
      
      setGroups(userGroups);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (groupData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newGroup = {
        id: 'group-' + Date.now(),
        ...groupData,
        createdBy: user.id,
        members: [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            isAdmin: true,
            isCreator: true,
            balance: 0,
            totalExpenses: 0,
            joinedAt: new Date().toISOString()
          }
        ],
        expenses: [],
        userBalance: 0,
        totalExpenses: 0,
        pendingExpenses: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setGroups(prev => [newGroup, ...prev]);
      return { success: true, group: newGroup };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateGroup = async (groupId, updates) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGroups(prev =>
        prev.map(group =>
          group.id === groupId
            ? { ...group, ...updates, updatedAt: new Date().toISOString() }
            : group
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

  const deleteGroup = async (groupId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setGroups(prev => prev.filter(group => group.id !== groupId));
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (groupId, memberData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 700));
      
      const newMember = {
        ...memberData,
        id: 'user-' + Date.now(),
        isAdmin: false,
        balance: 0,
        totalExpenses: 0,
        joinedAt: new Date().toISOString()
      };
      
      setGroups(prev =>
        prev.map(group =>
          group.id === groupId
            ? {
                ...group,
                members: [...group.members, newMember],
                updatedAt: new Date().toISOString()
              }
            : group
        )
      );
      
      return { success: true, member: newMember };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const removeMember = async (groupId, memberId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGroups(prev =>
        prev.map(group =>
          group.id === groupId
            ? {
                ...group,
                members: group.members.filter(member => member.id !== memberId),
                updatedAt: new Date().toISOString()
              }
            : group
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

  const updateMemberRole = async (groupId, memberId, role) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setGroups(prev =>
        prev.map(group =>
          group.id === groupId
            ? {
                ...group,
                members: group.members.map(member =>
                  member.id === memberId
                    ? { ...member, isAdmin: role === 'admin' }
                    : member
                ),
                updatedAt: new Date().toISOString()
              }
            : group
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

  const getGroupById = (groupId) => {
    return groups.find(group => group.id === groupId);
  };

  const getTotalBalance = () => {
    return groups.reduce((total, group) => total + group.userBalance, 0);
  };

  const getPendingGroups = () => {
    return groups.filter(group => group.pendingExpenses > 0);
  };

  const leaveGroup = async (groupId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGroups(prev => prev.filter(group => group.id !== groupId));
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const joinGroup = async (inviteCode) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock group join - in real implementation, would validate invite code
      if (inviteCode === 'DEMO123') {
        const newGroup = {
          id: 'group-' + Date.now(),
          name: 'Demo Group',
          description: 'Joined via invite code',
          createdBy: 'other-user',
          members: [
            { id: user.id, name: user.name, email: user.email, isAdmin: false, balance: 0, totalExpenses: 0 }
          ],
          expenses: [],
          userBalance: 0,
          totalExpenses: 0,
          pendingExpenses: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setGroups(prev => [newGroup, ...prev]);
        return { success: true, group: newGroup };
      } else {
        throw new Error('Invalid invite code');
      }
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    addMember,
    removeMember,
    updateMemberRole,
    getGroupById,
    getTotalBalance,
    getPendingGroups,
    leaveGroup,
    joinGroup,
    refetch: fetchGroups
  };
}