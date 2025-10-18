import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Layout from '../../components/layout/Layout';
import AuthGuard from '../../components/auth/AuthGuard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import { useSettlements } from '../../hooks/useSettlements';
import { useGroups } from '../../hooks/useGroups';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  PlusIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function Settlements() {
  const router = useRouter();
  const { group: groupId, expense: expenseId } = router.query;
  const { user } = useAuth();
  const { 
    settlements, 
    createSettlement, 
    markSettlementPaid,
    getSettlementSuggestions,
    loading 
  } = useSettlements();
  const { groups } = useGroups();
  const [selectedGroup, setSelectedGroup] = useState(groupId || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingSettlement, setCreatingSettlement] = useState(false);

  const filteredSettlements = settlements.filter(settlement => 
    !selectedGroup || settlement.groupId === selectedGroup
  );

  const pendingSettlements = filteredSettlements.filter(s => s.status === 'pending');
  const completedSettlements = filteredSettlements.filter(s => s.status === 'completed');

  const handleCreateSettlement = async (suggestion) => {
    setCreatingSettlement(true);
    try {
      const result = await createSettlement({
        fromUserId: suggestion.fromUserId,
        toUserId: suggestion.toUserId,
        amount: suggestion.amount,
        groupId: suggestion.groupId,
        description: `Settlement for ${suggestion.groupName}`
      });
      
      if (result.success) {
        toast.success('Settlement created successfully');
        fetchSuggestions();
      } else {
        toast.error(result.message || 'Failed to create settlement');
      }
    } catch (error) {
      console.error('Error creating settlement:', error);
      toast.error('Failed to create settlement');
    }
    setCreatingSettlement(false);
  };

  const handleMarkPaid = async (settlementId) => {
    try {
      const result = await markSettlementPaid(settlementId);
      if (result.success) {
        toast.success('Settlement marked as paid');
      } else {
        toast.error(result.message || 'Failed to mark settlement as paid');
      }
    } catch (error) {
      console.error('Error marking settlement as paid:', error);
      toast.error('Failed to mark settlement as paid');
    }
  };

  const fetchSuggestions = async () => {
    try {
      const result = await getSettlementSuggestions(selectedGroup);
      if (result.success) {
        setSuggestions(result.data);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>Settlements - SplitSafeX</title>
          <meta name="description" content="Settle up expenses with your friends and track payment history." />
        </Head>

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Settlements
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Settle up expenses and track payment history
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex space-x-3">
                <Button
                  variant="outline"
                  onClick={fetchSuggestions}
                  className="flex items-center"
                >
                  <ArrowPathIcon className="h-5 w-5 mr-2" />
                  Refresh
                </Button>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Settlement
                </Button>
              </div>
            </div>
          </div>

          {/* Filter */}
          <Card className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Group:
              </label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Groups</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </Card>

          {/* Settlement Suggestions */}
          {suggestions.length > 0 && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Suggested Settlements
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Based on your current balances, here are some suggested settlements to simplify your debts.
              </p>
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                            {suggestion.fromUserName.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {suggestion.fromUserName}
                        </span>
                      </div>
                      <span className="text-gray-500">owes</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                          <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                            {suggestion.toUserName.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {suggestion.toUserName}
                        </span>
                      </div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(suggestion.amount)}
                      </div>
                      <div className="text-sm text-gray-500">
                        in {suggestion.groupName}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleCreateSettlement(suggestion)}
                      disabled={creatingSettlement}
                      loading={creatingSettlement}
                    >
                      Create Settlement
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Pending Settlements
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {pendingSettlements.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Completed Settlements
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {completedSettlements.length}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Amount
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(
                      filteredSettlements.reduce((sum, s) => sum + s.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Settlements List */}
          <div className="space-y-6">
            {/* Pending Settlements */}
            {pendingSettlements.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Pending Settlements ({pendingSettlements.length})
                </h2>
                <div className="space-y-4">
                  {pendingSettlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(settlement.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(settlement.status)}`}>
                            {settlement.status.charAt(0).toUpperCase() + settlement.status.slice(1)}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                              {settlement.fromUserName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {settlement.fromUserName}
                          </span>
                        </div>

                        <span className="text-gray-500">→</span>

                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                              {settlement.toUserName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {settlement.toUserName}
                          </span>
                        </div>

                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(settlement.amount)}
                        </div>

                        <div className="text-sm text-gray-500">
                          {settlement.groupName} • {formatDate(settlement.createdAt)}
                        </div>
                      </div>

                      <div className="flex space-x-2">
                        {(settlement.fromUserId === user.id || settlement.toUserId === user.id) && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkPaid(settlement.id)}
                            disabled={loading}
                          >
                            Mark as Paid
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/settlements/${settlement.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Completed Settlements */}
            {completedSettlements.length > 0 && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Recent Completed Settlements ({completedSettlements.length})
                </h2>
                <div className="space-y-4">
                  {completedSettlements.slice(0, 10).map((settlement) => (
                    <div
                      key={settlement.id}
                      className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg opacity-75"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(settlement.status)}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(settlement.status)}`}>
                            Completed
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                              {settlement.fromUserName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {settlement.fromUserName}
                          </span>
                        </div>

                        <span className="text-gray-500">→</span>

                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                            <span className="text-green-600 dark:text-green-400 font-semibold text-sm">
                              {settlement.toUserName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {settlement.toUserName}
                          </span>
                        </div>

                        <div className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(settlement.amount)}
                        </div>

                        <div className="text-sm text-gray-500">
                          {settlement.groupName} • {formatDate(settlement.completedAt)}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/settlements/${settlement.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Empty State */}
            {filteredSettlements.length === 0 && (
              <Card className="p-12">
                <div className="text-center">
                  <BanknotesIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                    No settlements found
                  </h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {selectedGroup 
                      ? 'No settlements found for the selected group'
                      : 'Create your first settlement to start tracking payments'
                    }
                  </p>
                  <div className="mt-6 space-x-3">
                    {selectedGroup && (
                      <Button
                        variant="outline"
                        onClick={() => setSelectedGroup('')}
                      >
                        Show All Settlements
                      </Button>
                    )}
                    <Button onClick={() => setShowCreateModal(true)}>
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Create Settlement
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Quick Actions */}
          {filteredSettlements.length > 0 && (
            <Card className="mt-8 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => setShowCreateModal(true)}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Settlement
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => router.push('/groups')}
                >
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  View Groups
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-center"
                  onClick={() => router.push('/expenses')}
                >
                  <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                  View Expenses
                </Button>
              </div>
            </Card>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}