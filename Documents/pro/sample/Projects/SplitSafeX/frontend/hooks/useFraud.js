import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useExpenses } from './useExpenses';

// Mock fraud detection data - replace with actual API calls
const mockFraudReports = [
  {
    id: 'fraud-1',
    expenseId: 'exp-1',
    userId: 'user-1',
    type: 'duplicate',
    severity: 'medium',
    confidence: 0.75,
    description: 'Similar expense amount and timing detected',
    details: {
      similarExpenses: ['exp-3', 'exp-5'],
      timeWindow: '2 hours',
      amountDifference: 0.50
    },
    status: 'pending',
    createdAt: '2024-01-15T20:00:00Z',
    resolvedAt: null,
    notes: []
  },
  {
    id: 'fraud-2',
    expenseId: 'exp-4',
    userId: 'user-2',
    type: 'unusual_pattern',
    severity: 'high',
    confidence: 0.88,
    description: 'Expense amount significantly above user average',
    details: {
      userAverage: 35.50,
      expenseAmount: 150.00,
      deviation: 323.9
    },
    status: 'investigated',
    createdAt: '2024-01-14T15:30:00Z',
    resolvedAt: '2024-01-14T16:45:00Z',
    notes: ['Verified with receipt', 'Valid business expense']
  }
];

export function useFraud() {
  const { user } = useAuth();
  const { expenses } = useExpenses();
  const [fraudReports, setFraudReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFraudReports();
  }, [user]);

  const fetchFraudReports = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      setFraudReports(mockFraudReports);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeExpense = async (expenseId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate AI fraud analysis delay
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Mock fraud analysis - in real implementation, would use ML model
      const fraudScore = Math.random();
      const analysis = {
        expenseId,
        fraudScore,
        riskLevel: fraudScore > 0.7 ? 'high' : fraudScore > 0.4 ? 'medium' : 'low',
        factors: []
      };

      // Add risk factors based on score
      if (fraudScore > 0.3) {
        analysis.factors.push('Unusual spending pattern');
      }
      if (fraudScore > 0.5) {
        analysis.factors.push('High amount compared to user average');
      }
      if (fraudScore > 0.7) {
        analysis.factors.push('Similar transaction detected recently');
      }
      if (fraudScore > 0.8) {
        analysis.factors.push('Suspicious timing or location');
      }

      return { success: true, analysis };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const reportFraud = async (expenseId, reportData) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newReport = {
        id: 'fraud-' + Date.now(),
        expenseId,
        userId: user.id,
        type: reportData.type || 'manual_report',
        severity: reportData.severity || 'medium',
        confidence: reportData.confidence || 0.9,
        description: reportData.description,
        details: reportData.details || {},
        status: 'pending',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        notes: []
      };
      
      setFraudReports(prev => [newReport, ...prev]);
      return { success: true, report: newReport };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const investigateReport = async (reportId, notes) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setFraudReports(prev =>
        prev.map(report =>
          report.id === reportId
            ? {
                ...report,
                status: 'investigated',
                notes: [...report.notes, ...notes],
                resolvedAt: new Date().toISOString()
              }
            : report
        )
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const resolveReport = async (reportId, resolution) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      setFraudReports(prev =>
        prev.map(report =>
          report.id === reportId
            ? {
                ...report,
                status: resolution === 'valid' ? 'resolved_valid' : 'resolved_fraud',
                resolvedAt: new Date().toISOString(),
                resolution
              }
            : report
        )
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const dismissReport = async (reportId, reason) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setFraudReports(prev =>
        prev.map(report =>
          report.id === reportId
            ? {
                ...report,
                status: 'dismissed',
                dismissalReason: reason,
                resolvedAt: new Date().toISOString()
              }
            : report
        )
      );
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getFraudReportById = (reportId) => {
    return fraudReports.find(report => report.id === reportId);
  };

  const getPendingReports = () => {
    return fraudReports.filter(report => report.status === 'pending');
  };

  const getHighRiskReports = () => {
    return fraudReports.filter(report => report.severity === 'high');
  };

  const getFraudStats = () => {
    const total = fraudReports.length;
    const pending = fraudReports.filter(r => r.status === 'pending').length;
    const resolved = fraudReports.filter(r => r.status.startsWith('resolved')).length;
    const highRisk = fraudReports.filter(r => r.severity === 'high').length;
    
    return { total, pending, resolved, highRisk };
  };

  const getExpenseFraudScore = (expenseId) => {
    const expense = expenses.find(exp => exp.id === expenseId);
    return expense?.fraudScore || 0;
  };

  const getFlaggedExpenses = () => {
    return expenses.filter(expense => expense.fraudScore > 0.7);
  };

  const bulkAnalyzeExpenses = async (expenseIds) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate bulk analysis delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const results = expenseIds.map(id => ({
        expenseId: id,
        fraudScore: Math.random(),
        analyzed: true,
        analysisTime: new Date().toISOString()
      }));
      
      return { success: true, results };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateFraudThreshold = async (threshold) => {
    try {
      setLoading(true);
      setError(null);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // In real implementation, would update user preferences
      localStorage.setItem('fraudThreshold', threshold.toString());
      
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const getFraudThreshold = () => {
    return parseFloat(localStorage.getItem('fraudThreshold')) || 0.7;
  };

  return {
    fraudReports,
    loading,
    error,
    analyzeExpense,
    reportFraud,
    investigateReport,
    resolveReport,
    dismissReport,
    getFraudReportById,
    getPendingReports,
    getHighRiskReports,
    getFraudStats,
    getExpenseFraudScore,
    getFlaggedExpenses,
    bulkAnalyzeExpenses,
    updateFraudThreshold,
    getFraudThreshold,
    refetch: fetchFraudReports
  };
}