import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import AuthGuard from '../../components/auth/AuthGuard';
import ExpenseForm from '../../components/expenses/ExpenseForm';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useExpenses } from '../../hooks/useExpenses';
import { useGroups } from '../../hooks/useGroups';
import { toast } from 'react-hot-toast';

export default function AddExpense() {
  const router = useRouter();
  const { createExpense, loading } = useExpenses();
  const { groups, fetchUserGroups } = useGroups();
  const [step, setStep] = useState(1);
  const [expenseData, setExpenseData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    groupId: '',
    receipt: null,
    splitMethod: 'equal',
    participants: [],
    customSplits: {},
    notes: ''
  });

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const handleExpenseSubmit = async (data) => {
    try {
      const result = await createExpense(data);
      if (result.success) {
        toast.success('Expense created successfully!');
        router.push(`/expenses/${result.data.id}`);
      } else {
        toast.error(result.message || 'Failed to create expense');
      }
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>Add Expense - SplitSafeX</title>
          <meta name="description" content="Add a new shared expense" />
        </Head>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center space-x-4 mb-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back
              </Button>
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Add New Expense
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Split costs fairly among group members
            </p>
          </div>

          {/* Progress Indicator */}
          <Card className="mb-6 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {[1, 2, 3].map((stepNumber) => (
                  <div key={stepNumber} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step >= stepNumber
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {stepNumber}
                    </div>
                    {stepNumber < 3 && (
                      <div
                        className={`w-12 h-1 mx-2 ${
                          step > stepNumber
                            ? 'bg-primary-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Step {step} of 3
              </div>
            </div>
            
            <div className="mt-4 flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>Expense Details</span>
              <span>Select Participants</span>
              <span>Split & Confirm</span>
            </div>
          </Card>

          {/* Expense Form */}
          <Card className="p-6">
            <ExpenseForm
              initialData={expenseData}
              groups={groups}
              currentStep={step}
              onStepChange={setStep}
              onDataChange={setExpenseData}
              onSubmit={handleExpenseSubmit}
              loading={loading}
            />
          </Card>

          {/* Help Text */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Tips for adding expenses
                </h3>
                <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Upload receipts for better tracking and transparency</li>
                    <li>Choose the appropriate split method based on how costs should be shared</li>
                    <li>Add detailed descriptions to help everyone understand the expense</li>
                    <li>Use categories to organize and analyze your spending patterns</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <Card className="p-4 flex-1">
              <div className="text-center">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Need to create a group first?
                </h4>
                <Button
                  variant="outline"
                  onClick={() => router.push('/groups/create')}
                  className="w-full"
                >
                  Create New Group
                </Button>
              </div>
            </Card>
            
            <Card className="p-4 flex-1">
              <div className="text-center">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  View existing expenses
                </h4>
                <Button
                  variant="outline"
                  onClick={() => router.push('/expenses')}
                  className="w-full"
                >
                  Browse Expenses
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    </AuthGuard>
  );
}