import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/layout/Layout';
import AuthGuard from '../components/auth/AuthGuard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Loading from '../components/ui/Loading';
import { useAuth } from '../hooks/useAuth';
import { useExpenses } from '../hooks/useExpenses';
import { useGroups } from '../hooks/useGroups';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  ChartBarIcon, 
  CreditCardIcon, 
  UserGroupIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const { expenses, loading: expensesLoading, getUserBalance, getTotalExpenses } = useExpenses();
  const { groups, loading: groupsLoading, getTotalBalance } = useGroups();
  const [metrics, setMetrics] = useState({
    totalExpenses: 0,
    totalOwed: 0,
    totalOwing: 0,
    activeGroups: 0
  });

  useEffect(() => {
    if (user && expenses && groups) {
      calculateMetrics();
    }
  }, [user, expenses, groups]);

  const calculateMetrics = () => {
    try {
      // Calculate dashboard metrics from expenses and balances
      const totalExpenses = getTotalExpenses();
      const userBalance = getUserBalance();
      const groupBalance = getTotalBalance();
      
      // Calculate what user is owed vs owes
      const totalOwed = Math.max(0, userBalance + groupBalance);
      const totalOwing = Math.max(0, -(userBalance + groupBalance));
      
      setMetrics({
        totalExpenses,
        totalOwed,
        totalOwing,
        activeGroups: groups.length
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const quickActions = [
    {
      title: 'Add Expense',
      description: 'Record a new expense',
      icon: PlusIcon,
      href: '/expenses/add',
      color: 'bg-primary-500 hover:bg-primary-600',
      textColor: 'text-white'
    },
    {
      title: 'Create Group',
      description: 'Start a new group',
      icon: UserGroupIcon,
      href: '/groups/create',
      color: 'bg-secondary-500 hover:bg-secondary-600',
      textColor: 'text-white'
    },
    {
      title: 'View Balances',
      description: 'Check what you owe',
      icon: ChartBarIcon,
      href: '/settlements',
      color: 'bg-accent-500 hover:bg-accent-600',
      textColor: 'text-white'
    }
  ];

  const recentExpenses = expenses.slice(0, 5);

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>Dashboard - SplitSafeX</title>
          <meta name="description" content="Manage your shared expenses and group payments" />
        </Head>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {user?.firstName}! 👋
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Here's what's happening with your expenses
              </p>
            </div>
            <div className="mt-4 lg:mt-0">
              <Button
                onClick={() => router.push('/expenses/add')}
                className="bg-primary-500 hover:bg-primary-600 text-white"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CreditCardIcon className="h-8 w-8 text-primary-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Expenses
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(metrics.totalExpenses)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ArrowRightIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    You're Owed
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(metrics.totalOwed)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    You Owe
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(metrics.totalOwing)}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-secondary-500" />
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
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Card 
                key={action.title}
                className="p-6 cursor-pointer transition-all duration-200 hover:shadow-lg"
                onClick={() => router.push(action.href)}
              >
                <div className="flex items-center">
                  <div className={`flex-shrink-0 p-3 rounded-lg ${action.color}`}>
                    <action.icon className={`h-6 w-6 ${action.textColor}`} />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {action.description}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Expenses */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Recent Expenses
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/expenses')}
                  >
                    View All
                  </Button>
                </div>
                
                {expensesLoading ? (
                  <Loading />
                ) : recentExpenses.length > 0 ? (
                  <div className="space-y-4">
                    {recentExpenses.map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {expense.description}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate(expense.date)} • {expense.groupName}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(expense.amount)}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {expense.participants.length} people
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCardIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No expenses yet. Add your first expense to get started!
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Active Groups */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Your Groups
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/groups')}
                  >
                    View All
                  </Button>
                </div>
                
                {groupsLoading ? (
                  <Loading />
                ) : groups.length > 0 ? (
                  <div className="space-y-4">
                    {groups.slice(0, 5).map((group) => (
                      <div key={group.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {group.name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {group.memberCount} members • {group.expenseCount} expenses
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(group.totalAmount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No groups yet. Create a group to start splitting expenses!
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}