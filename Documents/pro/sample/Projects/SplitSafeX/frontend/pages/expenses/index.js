import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import AuthGuard from '../../components/auth/AuthGuard';
import ExpenseCard from '../../components/expenses/ExpenseCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Loading from '../../components/ui/Loading';
import Card from '../../components/ui/Card';
import { useExpenses } from '../../hooks/useExpenses';
import { useGroups } from '../../hooks/useGroups';
import { formatCurrency } from '../../utils/formatters';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronDownIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';

export default function ExpensesPage() {
  const router = useRouter();
  const { expenses, loading, fetchExpenses, totalExpenses } = useExpenses();
  const { groups } = useGroups();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  const categories = [
    'Food & Dining',
    'Transportation',
    'Entertainment',
    'Shopping',
    'Utilities',
    'Healthcare',
    'Travel',
    'Other'
  ];

  useEffect(() => {
    fetchExpenses({
      search: searchTerm,
      groupId: selectedGroup !== 'all' ? selectedGroup : undefined,
      category: selectedCategory !== 'all' ? selectedCategory : undefined,
      sortBy,
      sortOrder
    });
  }, [searchTerm, selectedGroup, selectedCategory, sortBy, sortOrder]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === 'all' || expense.groupId === selectedGroup;
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    
    return matchesSearch && matchesGroup && matchesCategory;
  });

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>Expenses - SplitSafeX</title>
          <meta name="description" content="Manage and track your shared expenses" />
        </Head>

        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Expenses
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track and manage your shared expenses
              </p>
            </div>
            <div className="mt-4 lg:mt-0 flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center"
              >
                <FunnelIcon className="h-5 w-5 mr-2" />
                Filters
              </Button>
              <Button
                onClick={() => router.push('/expenses/add')}
                className="bg-primary-500 hover:bg-primary-600 text-white"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>

          {/* Summary Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    {formatCurrency(totalExpenses)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-secondary-100 dark:bg-secondary-900 rounded-full flex items-center justify-center">
                    <span className="text-secondary-600 dark:text-secondary-400 font-semibold">
                      {filteredExpenses.length}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Items
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {filteredExpenses.length} expenses
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 bg-accent-100 dark:bg-accent-900 rounded-full flex items-center justify-center">
                    <span className="text-accent-600 dark:text-accent-400 font-semibold">
                      {groups.length}
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active Groups
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {groups.length} groups
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search and Filters */}
          <Card className="p-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search expenses by description or category..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-10"
                />
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {/* Group Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Group
                    </label>
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">All Groups</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="all">All Categories</option>
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort By
                    </label>
                    <select
                      value={`${sortBy}-${sortOrder}`}
                      onChange={(e) => {
                        const [field, order] = e.target.value.split('-');
                        setSortBy(field);
                        setSortOrder(order);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="date-desc">Newest First</option>
                      <option value="date-asc">Oldest First</option>
                      <option value="amount-desc">Highest Amount</option>
                      <option value="amount-asc">Lowest Amount</option>
                      <option value="description-asc">A-Z</option>
                      <option value="description-desc">Z-A</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Expenses List */}
          <div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loading size="lg" />
              </div>
            ) : filteredExpenses.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onClick={() => router.push(`/expenses/${expense.id}`)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-12">
                <div className="text-center">
                  <CreditCardIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {searchTerm || selectedGroup !== 'all' || selectedCategory !== 'all' 
                      ? 'No expenses found' 
                      : 'No expenses yet'
                    }
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {searchTerm || selectedGroup !== 'all' || selectedCategory !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Start by adding your first expense to track shared costs'
                    }
                  </p>
                  {(!searchTerm && selectedGroup === 'all' && selectedCategory === 'all') && (
                    <Button
                      onClick={() => router.push('/expenses/add')}
                      className="bg-primary-500 hover:bg-primary-600 text-white"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Add Your First Expense
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Load More Button (for pagination) */}
          {filteredExpenses.length > 0 && filteredExpenses.length % 20 === 0 && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => fetchExpenses({ loadMore: true })}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </Button>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}