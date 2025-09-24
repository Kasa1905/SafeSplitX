import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/layout/Layout';
import AuthGuard from '../../components/auth/AuthGuard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Loading from '../../components/ui/Loading';
import GroupCard from '../../components/groups/GroupCard';
import { useGroups } from '../../hooks/useGroups';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency } from '../../utils/formatters';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

export default function Groups() {
  const { user } = useAuth();
  const { 
    groups, 
    getTotalGroupBalance, 
    getActiveGroups, 
    getGroupMetrics,
    loading 
  } = useGroups();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, active, archived
  const [metrics, setMetrics] = useState({
    totalGroups: 0,
    activeGroups: 0,
    totalBalance: 0,
    totalMembers: 0
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    calculateMetrics();
  }, [groups]);

  const fetchGroups = async () => {
    try {
      const result = await getActiveGroups();
      if (!result.success) {
        console.error('Error fetching groups:', result.message);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const calculateMetrics = async () => {
    try {
      const metricsResult = await getGroupMetrics();
      if (metricsResult.success) {
        setMetrics(metricsResult.data);
      }
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const filteredGroups = groups.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         group.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === 'all' || 
                         (filterType === 'active' && group.status === 'active') ||
                         (filterType === 'archived' && group.status === 'archived');
    
    return matchesSearch && matchesFilter;
  });

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getBalanceText = (balance) => {
    if (balance > 0) return `You are owed ${formatCurrency(Math.abs(balance))}`;
    if (balance < 0) return `You owe ${formatCurrency(Math.abs(balance))}`;
    return 'You are settled up';
  };

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>Groups - SplitSafeX</title>
          <meta name="description" content="Manage your expense groups and split costs with friends and family." />
        </Head>

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Groups
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Manage your expense groups and track shared costs
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Link href="/groups/create">
                  <Button className="flex items-center">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Group
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Groups
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.totalGroups}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Groups
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.activeGroups}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <BanknotesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Balance
                  </p>
                  <p className={`text-2xl font-bold ${getBalanceColor(metrics.totalBalance)}`}>
                    {formatCurrency(Math.abs(metrics.totalBalance))}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <UsersIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Members
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics.totalMembers}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex space-x-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                {[
                  { id: 'all', label: 'All Groups', count: groups.length },
                  { id: 'active', label: 'Active', count: groups.filter(g => g.status === 'active').length },
                  { id: 'archived', label: 'Archived', count: groups.filter(g => g.status === 'archived').length }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setFilterType(filter.id)}
                    className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                      filterType === filter.id
                        ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {filter.label} ({filter.count})
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Groups Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loading size="lg" />
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  userBalance={group.userBalance || 0}
                  onClick={() => window.location.href = `/groups/${group.id}`}
                />
              ))}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center">
                <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  {searchQuery || filterType !== 'all' ? 'No matching groups found' : 'No groups yet'}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {searchQuery || filterType !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Create your first group to start splitting expenses with friends and family'
                  }
                </p>
                {(!searchQuery && filterType === 'all') && (
                  <div className="mt-6">
                    <Link href="/groups/create">
                      <Button>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create Your First Group
                      </Button>
                    </Link>
                  </div>
                )}
                {(searchQuery || filterType !== 'all') && (
                  <div className="mt-6 space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterType('all');
                      }}
                    >
                      Clear Filters
                    </Button>
                    <Link href="/groups/create">
                      <Button>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Create New Group
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          {groups.length > 0 && (
            <Card className="mt-8 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Link href="/groups/create">
                  <Button variant="outline" className="w-full justify-center">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create New Group
                  </Button>
                </Link>
                <Link href="/expenses/add">
                  <Button variant="outline" className="w-full justify-center">
                    <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                    Add Expense
                  </Button>
                </Link>
                <Link href="/settlements">
                  <Button variant="outline" className="w-full justify-center">
                    <BanknotesIcon className="h-4 w-4 mr-2" />
                    Settle Up
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Overall Balance Summary */}
          {groups.length > 0 && (
            <Card className="mt-6 p-6 bg-gradient-to-r from-primary-50 to-accent-50 dark:from-primary-900/20 dark:to-accent-900/20">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Your Overall Balance
                </h3>
                <p className={`text-2xl font-bold ${getBalanceColor(metrics.totalBalance)}`}>
                  {getBalanceText(metrics.totalBalance)}
                </p>
                <div className="mt-4">
                  <Link href="/settlements">
                    <Button>
                      View All Settlements
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}