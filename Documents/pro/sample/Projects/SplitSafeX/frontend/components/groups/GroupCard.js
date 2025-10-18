import Link from 'next/link';
import { formatCurrency } from '../../utils/formatters';
import {
  UserGroupIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CogIcon
} from '@heroicons/react/24/outline';

export default function GroupCard({ 
  group, 
  showBalance = true, 
  compact = false,
  className = '' 
}) {
  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600 dark:text-green-400';
    if (balance < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getTotalExpenses = () => {
    return group.expenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;
  };

  const getRecentActivity = () => {
    if (!group.expenses || group.expenses.length === 0) {
      return 'No recent activity';
    }
    
    const sortedExpenses = group.expenses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recentExpense = sortedExpenses[0];
    const daysAgo = Math.floor((new Date() - new Date(recentExpense.createdAt)) / (1000 * 60 * 60 * 24));
    
    if (daysAgo === 0) return 'Active today';
    if (daysAgo === 1) return 'Active yesterday';
    return `Active ${daysAgo} days ago`;
  };

  const hasFraudAlerts = group.expenses?.some(expense => expense.fraudScore > 0.7) || false;

  if (compact) {
    return (
      <Link href={`/groups/${group.id}`}>
        <div className={`p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
                  <UserGroupIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">
                  {group.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {group.members?.length || 0} members
                </p>
              </div>
            </div>
            {showBalance && (
              <div className="text-right">
                <p className={`font-semibold ${getBalanceColor(group.userBalance)}`}>
                  {group.userBalance > 0 ? '+' : ''}{formatCurrency(group.userBalance || 0)}
                </p>
                {hasFraudAlerts && (
                  <div className="flex items-center justify-end mt-1">
                    <ExclamationTriangleIcon className="h-3 w-3 text-red-500 mr-1" />
                    <span className="text-xs text-red-600">Alert</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="h-7 w-7 text-primary-600 dark:text-primary-400" />
            </div>
          </div>
          <div className="flex-1">
            <Link href={`/groups/${group.id}`}>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer">
                {group.name}
              </h3>
            </Link>
            {group.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {group.description}
              </p>
            )}
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <UserGroupIcon className="h-4 w-4 mr-1" />
                {group.members?.length || 0} members
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {getRecentActivity()}
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {hasFraudAlerts && (
            <div className="flex items-center text-red-600">
              <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Alert</span>
            </div>
          )}
          <Link href={`/groups/${group.id}/settings`}>
            <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <CogIcon className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </div>

      {/* Balance Section */}
      {showBalance && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your Balance</p>
              <p className={`text-2xl font-bold ${getBalanceColor(group.userBalance)}`}>
                {group.userBalance > 0 ? '+' : ''}{formatCurrency(group.userBalance || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {group.userBalance > 0 
                  ? 'You are owed' 
                  : group.userBalance < 0 
                    ? 'You owe' 
                    : 'Settled up'
                }
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(getTotalExpenses())}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {group.expenses?.length || 0} expenses
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-2">
              {group.members?.slice(0, 4).map((member, index) => (
                <div
                  key={member.id}
                  className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-700 dark:text-gray-300"
                  title={member.name}
                >
                  {member.name?.charAt(0).toUpperCase()}
                </div>
              ))}
              {group.members?.length > 4 && (
                <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-white dark:border-gray-800 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-400">
                  +{group.members.length - 4}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            {group.pendingExpenses > 0 && (
              <span className="flex items-center">
                <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                {group.pendingExpenses} pending
              </span>
            )}
            <Link href={`/groups/${group.id}`}>
              <span className="text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 font-medium cursor-pointer">
                View Details →
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}