#!/usr/bin/env node

/**
 * Fraud Analysis Script
 * Analyzes expenses for fraud patterns and generates reports
 */

const { fraudService } = require('../services/fraudService');
const { connectToDatabase } = require('../config/database');
require('dotenv').config();

class FraudAnalyzer {
  constructor() {
    this.results = {
      totalAnalyzed: 0,
      fraudDetected: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0,
      patterns: [],
      recommendations: []
    };
  }

  async analyzeExpenses(options = {}) {
    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate = new Date(),
      userId = null,
      generateReport = true
    } = options;

    console.log('🔍 Starting fraud analysis...');
    console.log(`📅 Date range: ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);
    
    try {
      await connectToDatabase();

      // Get expenses to analyze
      const expenses = await this.getExpenses({ startDate, endDate, userId });
      console.log(`📊 Analyzing ${expenses.length} expenses...`);

      for (const expense of expenses) {
        await this.analyzeExpense(expense);
      }

      // Detect patterns
      await this.detectPatterns();

      // Generate recommendations
      this.generateRecommendations();

      if (generateReport) {
        this.generateReport();
      }

      return this.results;

    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    }
  }

  async getExpenses({ startDate, endDate, userId }) {
    // Mock expense data for now - in production, this would query the database
    return [
      {
        id: '1',
        userId: userId || 'user1',
        amount: 1500.00,
        merchant: 'Electronics Store',
        category: 'electronics',
        timestamp: new Date(),
        location: { lat: 37.7749, lng: -122.4194 },
        device: 'mobile'
      },
      {
        id: '2',
        userId: userId || 'user1',
        amount: 25.99,
        merchant: 'Coffee Shop',
        category: 'food',
        timestamp: new Date(),
        location: { lat: 37.7849, lng: -122.4094 },
        device: 'card'
      },
      {
        id: '3',
        userId: userId || 'user2',
        amount: 5000.00,
        merchant: 'Luxury Goods',
        category: 'shopping',
        timestamp: new Date(),
        location: { lat: 40.7128, lng: -74.0060 },
        device: 'web'
      }
    ];
  }

  async analyzeExpense(expense) {
    try {
      const analysis = await fraudService.analyzeExpense(expense);
      
      this.results.totalAnalyzed++;

      if (analysis.riskLevel === 'high') {
        this.results.highRisk++;
        this.results.fraudDetected++;
        console.log(`🚨 HIGH RISK: Expense ${expense.id} - $${expense.amount} at ${expense.merchant}`);
      } else if (analysis.riskLevel === 'medium') {
        this.results.mediumRisk++;
        console.log(`⚠️  MEDIUM RISK: Expense ${expense.id} - $${expense.amount} at ${expense.merchant}`);
      } else if (analysis.riskLevel === 'low') {
        this.results.lowRisk++;
        console.log(`✅ LOW RISK: Expense ${expense.id} - $${expense.amount} at ${expense.merchant}`);
      }

      // Store detailed analysis
      if (analysis.riskLevel !== 'low') {
        this.results.patterns.push({
          expenseId: expense.id,
          riskLevel: analysis.riskLevel,
          riskScore: analysis.riskScore,
          factors: analysis.riskFactors,
          recommendations: analysis.recommendations
        });
      }

    } catch (error) {
      console.error(`❌ Failed to analyze expense ${expense.id}:`, error.message);
    }
  }

  async detectPatterns() {
    console.log('🔍 Detecting fraud patterns...');

    // Pattern detection logic
    const patterns = this.results.patterns;
    
    // High-amount transactions
    const highAmountPattern = patterns.filter(p => 
      p.factors && p.factors.includes('unusual_amount')
    );
    
    if (highAmountPattern.length > 0) {
      console.log(`📊 Pattern detected: ${highAmountPattern.length} high-amount transactions`);
    }

    // Location anomalies
    const locationPattern = patterns.filter(p => 
      p.factors && p.factors.includes('location_anomaly')
    );
    
    if (locationPattern.length > 0) {
      console.log(`🌍 Pattern detected: ${locationPattern.length} location anomalies`);
    }

    // Time-based patterns
    const timePattern = patterns.filter(p => 
      p.factors && p.factors.includes('unusual_time')
    );
    
    if (timePattern.length > 0) {
      console.log(`⏰ Pattern detected: ${timePattern.length} unusual timing transactions`);
    }
  }

  generateRecommendations() {
    const { fraudDetected, totalAnalyzed, highRisk, mediumRisk } = this.results;
    
    if (fraudDetected === 0) {
      this.results.recommendations.push('✅ No immediate fraud concerns detected');
      return;
    }

    if (highRisk > 0) {
      this.results.recommendations.push('🚨 Immediate review required for high-risk transactions');
      this.results.recommendations.push('📞 Consider contacting users for transaction verification');
    }

    if (mediumRisk > 5) {
      this.results.recommendations.push('⚠️  Monitor medium-risk transactions closely');
      this.results.recommendations.push('🔧 Consider adjusting fraud detection thresholds');
    }

    const fraudRate = (fraudDetected / totalAnalyzed) * 100;
    if (fraudRate > 5) {
      this.results.recommendations.push('📈 Fraud rate is elevated - review detection rules');
      this.results.recommendations.push('🔍 Consider additional verification steps');
    }
  }

  generateReport() {
    const { totalAnalyzed, fraudDetected, highRisk, mediumRisk, lowRisk, recommendations } = this.results;
    
    console.log('\n📋 FRAUD ANALYSIS REPORT');
    console.log('========================');
    console.log(`📊 Total expenses analyzed: ${totalAnalyzed}`);
    console.log(`🚨 Fraud detected: ${fraudDetected}`);
    console.log(`📈 Fraud rate: ${((fraudDetected / totalAnalyzed) * 100).toFixed(2)}%`);
    console.log('\n🎯 Risk Distribution:');
    console.log(`  🔴 High Risk: ${highRisk}`);
    console.log(`  🟡 Medium Risk: ${mediumRisk}`);
    console.log(`  🟢 Low Risk: ${lowRisk}`);
    
    if (recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    console.log('\n✅ Analysis completed');
  }
}

// CLI interface
const runAnalysis = async () => {
  const args = process.argv.slice(2);
  const options = {};

  // Parse CLI arguments
  args.forEach((arg, index) => {
    switch (arg) {
      case '--user':
        options.userId = args[index + 1];
        break;
      case '--days':
        const days = parseInt(args[index + 1]);
        options.startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        break;
      case '--no-report':
        options.generateReport = false;
        break;
      case '--help':
        console.log(`
Fraud Analysis Tool

Usage: npm run fraud:analyze [options]

Options:
  --user <userId>      Analyze specific user's expenses
  --days <number>      Number of days to analyze (default: 30)
  --no-report         Skip generating detailed report
  --help              Show this help message

Examples:
  npm run fraud:analyze
  npm run fraud:analyze -- --user user123 --days 7
`);
        process.exit(0);
    }
  });

  const analyzer = new FraudAnalyzer();
  const results = await analyzer.analyzeExpenses(options);
  
  return results;
};

// Run if called directly
if (require.main === module) {
  runAnalysis().catch(error => {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = { FraudAnalyzer, runAnalysis };