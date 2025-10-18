import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Alert from '../ui/Alert';
import { useExpenses } from '../../hooks/useExpenses';
import { useGroups } from '../../hooks/useGroups';
import { useAuth } from '../../hooks/useAuth';
import { validateExpense } from '../../utils/validation';
import {
  CameraIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon
} from '@heroicons/react/24/outline';

const categories = [
  { value: 'food', label: 'Food & Dining', icon: '🍽️' },
  { value: 'transportation', label: 'Transportation', icon: '🚗' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'utilities', label: 'Utilities', icon: '⚡' },
  { value: 'shopping', label: 'Shopping', icon: '🛍️' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'other', label: 'Other', icon: '💰' }
];

export default function ExpenseForm({ 
  expense = null, 
  groupId = null,
  onSubmit,
  onCancel 
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { groups } = useGroups();
  const { addExpense, updateExpense } = useExpenses();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'other',
    date: new Date().toISOString().split('T')[0],
    groupId: groupId || '',
    splitType: 'equal',
    participants: [],
    customSplits: {}
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        description: expense.description || '',
        amount: expense.amount?.toString() || '',
        category: expense.category || 'other',
        date: expense.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        groupId: expense.groupId || '',
        splitType: expense.splitType || 'equal',
        participants: expense.participants || [],
        customSplits: expense.customSplits || {}
      });
    }
  }, [expense]);

  const selectedGroup = groups?.find(g => g.id === formData.groupId);
  const availableMembers = selectedGroup?.members || [];

  // Initialize participants when group is selected
  useEffect(() => {
    if (selectedGroup && !expense) {
      setFormData(prev => ({
        ...prev,
        participants: selectedGroup.members.map(m => m.id)
      }));
    }
  }, [selectedGroup, expense]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (type === 'checkbox' && name === 'participants') {
      const memberId = value;
      setFormData(prev => ({
        ...prev,
        participants: checked 
          ? [...prev.participants, memberId]
          : prev.participants.filter(id => id !== memberId)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleCustomSplitChange = (memberId, amount) => {
    setFormData(prev => ({
      ...prev,
      customSplits: {
        ...prev.customSplits,
        [memberId]: parseFloat(amount) || 0
      }
    }));
  };

  const handleReceiptUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Receipt file size must be less than 5MB');
        return;
      }
      setReceipt(file);
    }
  };

  const removeReceipt = () => {
    setReceipt(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const validation = validateExpense(formData);
      if (!validation.isValid) {
        setError(validation.errors.join(', '));
        setLoading(false);
        return;
      }

      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        createdBy: user.id,
        createdAt: expense ? expense.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        receipt: receipt
      };

      if (expense) {
        await updateExpense(expense.id, expenseData);
      } else {
        await addExpense(expenseData);
      }

      if (onSubmit) {
        onSubmit();
      } else {
        router.push(formData.groupId ? `/groups/${formData.groupId}` : '/expenses');
      }
    } catch (err) {
      setError(err.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const totalCustomSplit = Object.values(formData.customSplits).reduce((sum, amount) => sum + (amount || 0), 0);
  const customSplitError = formData.splitType === 'custom' && Math.abs(totalCustomSplit - parseFloat(formData.amount || 0)) > 0.01;

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <Alert type="error" message={error} />}
        
        {/* Basic Info */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Expense Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="What was this expense for?"
                required
              />
            </div>
            
            <div>
              <Input
                label="Amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>
            
            <div>
              <Input
                label="Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group
              </label>
              <select
                name="groupId"
                value={formData.groupId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Personal Expense</option>
                {groups?.map(group => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Receipt Upload */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Receipt (Optional)
          </h3>
          
          {!receipt ? (
            <div>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <CameraIcon className="h-10 w-10 mb-3 text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> receipt
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or PDF (MAX. 5MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <CameraIcon className="h-6 w-6 text-green-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{receipt.name}</span>
              </div>
              <button
                type="button"
                onClick={removeReceipt}
                className="text-red-600 hover:text-red-800"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Split Settings */}
        {formData.groupId && availableMembers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Split Among Group Members
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Split Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="splitType"
                      value="equal"
                      checked={formData.splitType === 'equal'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Equal Split
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="splitType"
                      value="custom"
                      checked={formData.splitType === 'custom'}
                      onChange={handleChange}
                      className="mr-2"
                    />
                    Custom Amount
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Participants
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {availableMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="participants"
                          value={member.id}
                          checked={formData.participants.includes(member.id)}
                          onChange={handleChange}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {member.name} ({member.email})
                        </span>
                      </label>
                      
                      {formData.splitType === 'custom' && formData.participants.includes(member.id) && (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.customSplits[member.id] || ''}
                          onChange={(e) => handleCustomSplitChange(member.id, e.target.value)}
                          placeholder="0.00"
                          className="w-20"
                        />
                      )}
                    </div>
                  ))}
                </div>
                
                {formData.splitType === 'custom' && customSplitError && (
                  <p className="text-red-600 text-sm mt-1">
                    Custom splits (${totalCustomSplit.toFixed(2)}) don't match expense amount (${parseFloat(formData.amount || 0).toFixed(2)})
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel || (() => router.back())}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={customSplitError}
          >
            {expense ? 'Update Expense' : 'Add Expense'}
          </Button>
        </div>
      </form>
    </div>
  );
}