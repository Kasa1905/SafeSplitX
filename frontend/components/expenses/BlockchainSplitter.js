import { useState, useEffect } from 'react';
import { blockchainSplitter } from '../../utils/blockchain';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';
import Alert from '../ui/Alert';
import { useToast } from '../ui/Toast';

export default function BlockchainExpenseSplitter() {
  const [numUsers, setNumUsers] = useState('');
  const [userNames, setUserNames] = useState([]);
  const [users, setUsers] = useState([]);
  const [expenseAmount, setExpenseAmount] = useState('');
  const [shares, setShares] = useState([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const { success, error: showError } = useToast();

  const supportedCurrencies = blockchainSplitter.getSupportedCurrencies();

  const handleSetUsers = () => {
    const num = parseInt(numUsers);
    if (!num || num < 1) {
      setError('Enter a valid number of users');
      return;
    }

    if (num > 10) {
      setError('Maximum 10 users allowed (pretend blockchain has only 10 users)');
      return;
    }

    setError('');
    setUserNames(new Array(num).fill(''));
    setStep(2);
  };

  const handleUserNameChange = (index, value) => {
    const newNames = [...userNames];
    newNames[index] = value;
    setUserNames(newNames);
  };

  const handleConnectWallets = () => {
    try {
      const filteredNames = userNames.filter(name => name.trim() !== '');
      if (filteredNames.length !== userNames.length) {
        setError('Please fill in all user names');
        return;
      }

      const connectedUsers = blockchainSplitter.setUsers(filteredNames);
      setUsers(connectedUsers);
      setError('');
      success('Users connected successfully!');
      setStep(3);
    } catch (err) {
      setError(err.message);
      showError(err.message);
    }
  };

  const handleSettleExpense = () => {
    try {
      const amount = parseFloat(expenseAmount);
      const calculatedShares = blockchainSplitter.calculateShares(amount);
      setShares(calculatedShares);
      setExpenseAmount('');
      success('Expense settled successfully!');
    } catch (err) {
      setError(err.message);
      showError(err.message);
    }
  };

  const resetAll = () => {
    setNumUsers('');
    setUserNames([]);
    setUsers([]);
    setExpenseAmount('');
    setShares([]);
    setStep(1);
    setError('');
    blockchainSplitter.users = [];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Blockchain Expense Splitter
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Split expenses using blockchain technology with multi-currency support
          </p>

          {error && <Alert type="error" message={error} className="mb-4" />}

          {/* Step 1: Set Number of Users */}
          {step >= 1 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Step 1: Set Number of Users</h3>
              <div className="flex items-center space-x-4">
                <Input
                  type="number"
                  placeholder="Number of users (1-10)"
                  value={numUsers}
                  onChange={(e) => setNumUsers(e.target.value)}
                  min="1"
                  max="10"
                  disabled={step > 1}
                />
                <Button 
                  onClick={handleSetUsers}
                  disabled={step > 1}
                  variant={step > 1 ? 'outline' : 'primary'}
                >
                  {step > 1 ? 'Set ✓' : 'Set Users'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Enter User Names */}
          {step >= 2 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Step 2: Connect User Wallets</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Enter single letters (a-j) for each user
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
                {userNames.map((name, index) => (
                  <Input
                    key={index}
                    type="text"
                    placeholder={`User ${index + 1}`}
                    value={name}
                    onChange={(e) => handleUserNameChange(index, e.target.value)}
                    maxLength="1"
                    disabled={step > 2}
                    className="text-center"
                  />
                ))}
              </div>
              <Button 
                onClick={handleConnectWallets}
                disabled={step > 2}
                variant={step > 2 ? 'outline' : 'primary'}
                className="w-full"
              >
                {step > 2 ? 'Connected ✓' : 'Connect Wallets'}
              </Button>
            </div>
          )}

          {/* Step 3: Settle Expense */}
          {step >= 3 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Step 3: Settle Expense</h3>
              <div className="flex items-center space-x-4">
                <Input
                  type="number"
                  placeholder="Expense amount (USD)"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  step="0.01"
                  min="0"
                />
                <Button onClick={handleSettleExpense} variant="primary">
                  Settle Expense
                </Button>
              </div>
            </div>
          )}

          {/* Reset Button */}
          {step > 1 && (
            <div className="mb-6">
              <Button onClick={resetAll} variant="outline" className="w-full">
                Reset All
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Shares Table */}
      {shares.length > 0 && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Expense Shares by Currency</h3>
            <div className="overflow-x-auto">
              <table className="w-full table-auto border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                      User
                    </th>
                    {supportedCurrencies.map(currency => (
                      <th key={currency} className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {currency}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shares.map((share, index) => (
                    <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white uppercase">
                        {share.user}
                      </td>
                      {supportedCurrencies.map(currency => (
                        <td key={currency} className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                          {share.shares[currency].toFixed(2)} {currency}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

      {/* Exchange Rates Information */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Current Exchange Rates (Relative to USD)</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {supportedCurrencies.map(currency => (
              <div key={currency} className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="font-semibold text-gray-900 dark:text-white">{currency}</div>
                <div className="text-gray-600 dark:text-gray-400">
                  {blockchainSplitter.getExchangeRate(currency)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}