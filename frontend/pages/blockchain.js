import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import AuthGuard from '../components/auth/AuthGuard';
import BlockchainSplitter from '../components/expenses/BlockchainSplitter';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Tab from '../components/ui/Tab';

export default function Blockchain() {
  const [activeTab, setActiveTab] = useState('splitter');

  const tabs = [
    { id: 'splitter', label: 'Expense Splitter' },
    { id: 'info', label: 'How It Works' }
  ];

  return (
    <AuthGuard>
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Blockchain Features
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Advanced blockchain-based expense splitting with multi-currency support
              </p>
            </div>
          </div>

          <Tab
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            variant="pills"
          />

          {activeTab === 'splitter' && <BlockchainSplitter />}

          {activeTab === 'info' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    How Blockchain Expense Splitting Works
                  </h2>
                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Our blockchain-based expense splitting system provides secure, transparent, and 
                      multi-currency expense management with the following features:
                    </p>
                    
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Key Features:
                    </h3>
                    <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
                      <li>
                        <strong>Multi-Currency Support:</strong> Automatically converts expenses 
                        to USD, EUR, GBP, and INR using fixed exchange rates
                      </li>
                      <li>
                        <strong>User Validation:</strong> Secure user identification using 
                        single-letter identifiers (a-j) for simplified blockchain addressing
                      </li>
                      <li>
                        <strong>Equal Splitting:</strong> Fair distribution of expenses among 
                        all connected users
                      </li>
                      <li>
                        <strong>Real-time Calculation:</strong> Instant expense splitting and 
                        currency conversion
                      </li>
                      <li>
                        <strong>Transparent Settlement:</strong> Clear breakdown of each user's 
                        share in multiple currencies
                      </li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      Exchange Rates:
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="font-semibold">USD</div>
                          <div className="text-gray-600 dark:text-gray-400">1.00 (Base)</div>
                        </div>
                        <div>
                          <div className="font-semibold">EUR</div>
                          <div className="text-gray-600 dark:text-gray-400">0.93</div>
                        </div>
                        <div>
                          <div className="font-semibold">GBP</div>
                          <div className="text-gray-600 dark:text-gray-400">0.81</div>
                        </div>
                        <div>
                          <div className="font-semibold">INR</div>
                          <div className="text-gray-600 dark:text-gray-400">83.50</div>
                        </div>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-3">
                      How to Use:
                    </h3>
                    <ol className="list-decimal pl-6 text-gray-600 dark:text-gray-400 space-y-2">
                      <li>Enter the number of users who will split the expense (1-10)</li>
                      <li>Connect each user's wallet by entering a single letter (a-j)</li>
                      <li>Enter the expense amount in USD</li>
                      <li>View the calculated shares in all supported currencies</li>
                    </ol>

                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <p className="text-blue-800 dark:text-blue-200 text-sm">
                        <strong>Note:</strong> This is a demonstration of blockchain-style expense 
                        splitting. In a real blockchain implementation, users would connect actual 
                        cryptocurrency wallets, and transactions would be recorded on a distributed ledger.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </Layout>
    </AuthGuard>
  );
}