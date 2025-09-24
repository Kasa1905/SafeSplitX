import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/layout/Layout';
import AuthGuard from '../../components/auth/AuthGuard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Loading from '../../components/ui/Loading';
import Alert from '../../components/ui/Alert';
import { useFraud } from '../../hooks/useFraud';
import { useExpenses } from '../../hooks/useExpenses';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  ChartBarIcon,
  EyeIcon,
  FlagIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function Fraud() {
  const router = useRouter();
  const { expense: expenseId } = router.query;
  const { user } = useAuth();
  const { 
    fraudAlerts, 
    getFraudAnalysis, 
    markAlertsReviewed,
    reportFraud,
    loading 
  } = useFraud();
  const { getExpenseById } = useExpenses();
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [filterType, setFilterType] = useState('all'); // all, high, medium, low, resolved

  useEffect(() => {
    if (expenseId) {
      fetchExpenseAnalysis(expenseId);
    }
  }, [expenseId]);

  const fetchExpenseAnalysis = async (id) => {
    try {
      // Fetch expense details
      const expenseResult = await getExpenseById(id);
      if (expenseResult.success) {
        setSelectedExpense(expenseResult.data);
      }

      // Fetch fraud analysis
      const analysisResult = await getFraudAnalysis(id);
      if (analysisResult.success) {
        setAnalysis(analysisResult.data);
      }
    } catch (error) {
      console.error('Error fetching analysis:', error);
    }
  };

  const handleMarkReviewed = async (alertId) => {
    try {
      const result = await markAlertsReviewed([alertId]);
      if (result.success) {
        toast.success('Alert marked as reviewed');
      } else {
        toast.error('Failed to mark alert as reviewed');
      }
    } catch (error) {
      console.error('Error marking alert as reviewed:', error);
      toast.error('Failed to mark alert as reviewed');
    }
  };

  const handleReportFraud = async (expenseId, reason) => {
    try {
      const result = await reportFraud(expenseId, reason);
      if (result.success) {
        toast.success('Fraud report submitted');
      } else {
        toast.error('Failed to submit fraud report');
      }
    } catch (error) {
      console.error('Error reporting fraud:', error);
      toast.error('Failed to submit fraud report');
    }
  };

  const getRiskLevel = (score) => {
    if (score >= 0.8) return 'high';
    if (score >= 0.6) return 'medium';
    if (score >= 0.3) return 'low';
    return 'minimal';
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high':
        return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low':
        return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
    }
  };

  const filteredAlerts = fraudAlerts.filter(alert => {
    if (filterType === 'all') return true;
    if (filterType === 'resolved') return alert.status === 'resolved';
    return getRiskLevel(alert.riskScore) === filterType;
  });

  const getAlertStats = () => {
    const total = fraudAlerts.length;
    const high = fraudAlerts.filter(a => getRiskLevel(a.riskScore) === 'high').length;
    const medium = fraudAlerts.filter(a => getRiskLevel(a.riskScore) === 'medium').length;
    const resolved = fraudAlerts.filter(a => a.status === 'resolved').length;
    
    return { total, high, medium, resolved };
  };

  const stats = getAlertStats();

  return (
    <AuthGuard>
      <Layout>
        <Head>
          <title>Fraud Detection - SplitSafeX</title>
          <meta name="description" content="Monitor and analyze expenses for potential fraud patterns." />
        </Head>

        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  Fraud Detection
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Monitor expenses for suspicious patterns and potential fraud
                </p>
              </div>
              <div className="mt-4 sm:mt-0">
                <Button
                  onClick={() => router.push('/fraud/report')}
                  className="flex items-center"
                >
                  <FlagIcon className="h-5 w-5 mr-2" />
                  Report Fraud
                </Button>
              </div>
            </div>
          </div>

          {/* Alert Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <DocumentMagnifyingGlassIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Alerts
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.total}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    High Risk
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.high}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <ChartBarIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Medium Risk
                  </p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats.medium}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Resolved
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.resolved}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Specific Expense Analysis */}
          {selectedExpense && analysis && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Expense Analysis: {selectedExpense.description}
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Expense Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Expense Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedExpense.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Date:</span>
                      <span className="font-medium">{formatDate(selectedExpense.date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Category:</span>
                      <span className="font-medium">{selectedExpense.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Created By:</span>
                      <span className="font-medium">{selectedExpense.createdByName}</span>
                    </div>
                  </div>
                </div>

                {/* Fraud Analysis */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                    Fraud Analysis
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Risk Score:</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold">
                          {(analysis.riskScore * 100).toFixed(1)}%
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(getRiskLevel(analysis.riskScore))}`}>
                          {getRiskLevel(analysis.riskScore).toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          analysis.riskScore >= 0.8 ? 'bg-red-600' :
                          analysis.riskScore >= 0.6 ? 'bg-yellow-600' :
                          analysis.riskScore >= 0.3 ? 'bg-blue-600' : 'bg-green-600'
                        }`}
                        style={{ width: `${analysis.riskScore * 100}%` }}
                      ></div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">Risk Factors:</h4>
                      {analysis.factors.map((factor, index) => (
                        <div key={index} className="flex items-start space-x-2">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            factor.severity === 'high' ? 'bg-red-500' :
                            factor.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }`}></div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {factor.description}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Impact: {factor.impact}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {analysis.riskScore >= 0.6 && (
                <Alert
                  type="warning"
                  title="High Risk Detected"
                  description="This expense has been flagged for potential fraud. Please review the details carefully."
                  className="mt-6"
                />
              )}

              <div className="mt-6 flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/expenses/${selectedExpense.id}`)}
                >
                  <EyeIcon className="h-4 w-4 mr-2" />
                  View Expense
                </Button>
                {analysis.riskScore >= 0.6 && (
                  <Button
                    onClick={() => handleReportFraud(selectedExpense.id, 'Suspicious activity detected')}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    <FlagIcon className="h-4 w-4 mr-2" />
                    Report as Fraud
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Filter Tabs */}
          <Card className="p-6 mb-6">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'All Alerts', count: fraudAlerts.length },
                { id: 'high', label: 'High Risk', count: stats.high },
                { id: 'medium', label: 'Medium Risk', count: stats.medium },
                { id: 'low', label: 'Low Risk', count: fraudAlerts.filter(a => getRiskLevel(a.riskScore) === 'low').length },
                { id: 'resolved', label: 'Resolved', count: stats.resolved }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setFilterType(filter.id)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    filterType === filter.id
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>
          </Card>

          {/* Fraud Alerts */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loading size="lg" />
            </div>
          ) : filteredAlerts.length > 0 ? (
            <div className="space-y-4">
              {filteredAlerts.map((alert) => {
                const riskLevel = getRiskLevel(alert.riskScore);
                return (
                  <Card key={alert.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className={`p-1 rounded-full ${
                            riskLevel === 'high' ? 'bg-red-100 dark:bg-red-900' :
                            riskLevel === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900' :
                            'bg-blue-100 dark:bg-blue-900'
                          }`}>
                            <ExclamationTriangleIcon className={`h-4 w-4 ${
                              riskLevel === 'high' ? 'text-red-600 dark:text-red-400' :
                              riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-blue-600 dark:text-blue-400'
                            }`} />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {alert.expenseDescription}
                          </h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRiskColor(riskLevel)}`}>
                            {riskLevel.toUpperCase()} RISK
                          </span>
                          {alert.status === 'resolved' && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                              RESOLVED
                            </span>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(alert.amount)}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatDate(alert.date)}
                            </p>
                          </div>
                          <div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score:</span>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {(alert.riskScore * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Alert Reasons:
                          </h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
                            {alert.reasons.map((reason, index) => (
                              <li key={index}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="ml-6 flex flex-col space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/fraud?expense=${alert.expenseId}`)}
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          Analyze
                        </Button>
                        {alert.status !== 'resolved' && (
                          <Button
                            size="sm"
                            onClick={() => handleMarkReviewed(alert.id)}
                            disabled={loading}
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-2" />
                            Mark Reviewed
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-12">
              <div className="text-center">
                <ShieldCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                  {filterType === 'all' ? 'No fraud alerts' : `No ${filterType} risk alerts`}
                </h3>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  {filterType === 'all' 
                    ? 'All your expenses look safe and legitimate'
                    : `No alerts matching the ${filterType} risk filter`
                  }
                </p>
                {filterType !== 'all' && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setFilterType('all')}
                    >
                      Show All Alerts
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Security Tips */}
          <Card className="mt-8 p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start">
              <ShieldCheckIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Security Tips
                </h3>
                <ul className="space-y-1 text-blue-800 dark:text-blue-200 text-sm">
                  <li>• Always verify unusual or high-amount expenses with group members</li>
                  <li>• Check receipts for authenticity and accuracy</li>
                  <li>• Report suspicious activity immediately</li>
                  <li>• Review expense patterns regularly</li>
                  <li>• Keep receipts and documentation for all expenses</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </Layout>
    </AuthGuard>
  );
}