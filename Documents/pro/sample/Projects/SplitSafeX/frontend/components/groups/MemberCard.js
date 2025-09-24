import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CurrencyDollarIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { formatCurrency } from '../../utils/formatters';

export default function MemberCard({ 
  member, 
  group,
  showBalance = true,
  showActions = false,
  onRemove,
  compact = false,
  className = ''
}) {
  const getMemberBalance = () => {
    if (!member.balance && member.balance !== 0) return 0;
    return member.balance;
  };

  const getBalanceColor = (balance) => {
    if (balance > 0) return 'text-green-600 dark:text-green-400';
    if (balance < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getBalanceDescription = (balance) => {
    if (balance > 0) return 'gets back';
    if (balance < 0) return 'owes';
    return 'settled';
  };

  const getMemberRole = () => {
    if (member.isAdmin || member.role === 'admin') return 'Admin';
    if (member.isCreator || member.role === 'creator') return 'Creator';
    return 'Member';
  };

  const hasHighExpenses = member.totalExpenses > 1000; // Example threshold

  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
            {member.avatar ? (
              <img 
                src={member.avatar} 
                alt={member.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">
              {member.name}
            </p>
            {member.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {member.email}
              </p>
            )}
          </div>
        </div>
        
        {showBalance && (
          <div className="text-right">
            <p className={`font-semibold text-sm ${getBalanceColor(getMemberBalance())}`}>
              {formatCurrency(Math.abs(getMemberBalance()))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getBalanceDescription(getMemberBalance())}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="h-12 w-12 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
              {member.avatar ? (
                <img 
                  src={member.avatar} 
                  alt={member.name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
              )}
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {member.name}
              </h3>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                {getMemberRole()}
              </span>
              {hasHighExpenses && (
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" title="High spending activity" />
              )}
            </div>
            
            <div className="mt-1 space-y-1">
              {member.email && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  {member.email}
                </div>
              )}
              {member.phone && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  {member.phone}
                </div>
              )}
            </div>

            {member.joinedAt && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Joined {new Date(member.joinedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start space-x-2">
          {showActions && onRemove && !member.isCreator && (
            <button
              onClick={() => onRemove(member)}
              className="p-1 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Remove member"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Balance Section */}
      {showBalance && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Balance</p>
              <p className={`text-xl font-bold ${getBalanceColor(getMemberBalance())}`}>
                {getMemberBalance() > 0 ? '+' : ''}{formatCurrency(getMemberBalance())}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {getBalanceDescription(getMemberBalance())}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Expenses</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(member.totalExpenses || 0)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {member.expenseCount || 0} expenses
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      {(member.lastActivity || member.totalContribution) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            {member.lastActivity && (
              <span>
                Last active: {new Date(member.lastActivity).toLocaleDateString()}
              </span>
            )}
            {member.totalContribution && (
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                <span>
                  Contributed: {formatCurrency(member.totalContribution)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Methods */}
      {member.paymentMethods && member.paymentMethods.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Payment Methods
          </p>
          <div className="flex flex-wrap gap-2">
            {member.paymentMethods.map((method, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full"
              >
                {method.type}: {method.identifier}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}