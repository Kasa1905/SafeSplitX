import Link from 'next/link';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  CalendarIcon,
  TagIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function ExpenseCard({ 
  expense, 
  showGroup = true, 
  compact = false,
  className = ''
}) {
  const getStatusColor = (status) => {
    switch (status) {
      case 'settled':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'food':
        return '🍽️';
      case 'transportation':
        return '🚗';
      case 'entertainment':
        return '🎬';
      case 'utilities':
        return '⚡';
      case 'shopping':
        return '🛍️';
      case 'travel':
        return '✈️';
      default:
        return '💰';
    }
  };

  if (compact) {
    return (
      <Link href={`/expenses/${expense.id}`}>
        <div className={`p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-lg">{getCategoryIcon(expense.category)}</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  {expense.description}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{formatDate(expense.date)}</span>
                  {showGroup && expense.groupName && (
                    <>
                      <span>•</span>
                      <span>{expense.groupName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                {formatCurrency(expense.amount)}
              </p>
              {expense.fraudScore > 0.7 && (
                <div className="flex items-center justify-end mt-1">
                  <ExclamationTriangleIcon className="h-3 w-3 text-red-500 mr-1" />
                  <span className="text-xs text-red-600">Risk</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">{getCategoryIcon(expense.category)}</div>
          <div className="flex-1">
            <Link href={`/expenses/${expense.id}`}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer">
                {expense.description}
              </h3>
            </Link>
            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {formatDate(expense.date)}
              </div>
              <div className="flex items-center">
                <TagIcon className="h-4 w-4 mr-1" />
                {expense.category}
              </div>
              {showGroup && expense.groupName && (
                <div className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  <Link href={`/groups/${expense.groupId}`}>
                    <span className="hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer">
                      {expense.groupName}
                    </span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(expense.amount)}
          </p>
          <div className="flex items-center justify-end space-x-2 mt-1">
            {expense.status && (
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(expense.status)}`}>
                {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
              </span>
            )}
            {expense.fraudScore > 0.7 && (
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
                <span className="text-xs text-red-600 font-medium">High Risk</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Split info */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Split among {expense.participants?.length || 1} people</span>
            <span>•</span>
            <span>Paid by {expense.createdByName || 'Unknown'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Your share: {formatCurrency(expense.userShare || expense.amount / (expense.participants?.length || 1))}
            </span>
          </div>
        </div>
      </div>

      {/* Receipt indicator */}
      {expense.receipt && (
        <div className="mt-3 flex items-center text-sm text-green-600 dark:text-green-400">
          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Receipt attached
        </div>
      )}
    </div>
  );
}