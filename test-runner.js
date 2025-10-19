#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = new Date();
    this.reportFile = `test-report-${this.startTime.toISOString().replace(/[:.]/g, '-')}.json`;
    
    console.log('🧪 Test Runner initialized');
    console.log('📊 Report will be saved to:', this.reportFile);
  }

  logTest(testName, component, status, details, executionTime = 0) {
    const result = {
      testName,
      component,
      status, // 'pass', 'fail', 'warning'
      executionTime,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.push(result);
    
    const statusIcon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
    console.log(`${statusIcon} [${component}] ${testName}: ${status.toUpperCase()}`);
    if (details) console.log(`   Details: ${details}`);
  }

  logIssue(id, severity, category, description, location, recommendation) {
    const issue = {
      id,
      severity, // 'critical', 'high', 'medium', 'low'
      category, // 'security', 'functionality', 'performance', 'ux'
      description,
      location,
      recommendation,
      status: 'open',
      timestamp: new Date().toISOString()
    };
    
    if (!this.issues) this.issues = [];
    this.issues.push(issue);
    
    const severityIcon = severity === 'critical' ? '🚨' : severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🔵';
    console.log(`${severityIcon} ISSUE [${severity.toUpperCase()}]: ${description}`);
    console.log(`   Location: ${location}`);
    console.log(`   Recommendation: ${recommendation}`);
  }

  takeScreenshot(testName, description) {
    // Placeholder for screenshot functionality
    const screenshotPath = `screenshots/${testName}-${Date.now()}.png`;
    console.log(`📸 Screenshot placeholder: ${screenshotPath} - ${description}`);
    return screenshotPath;
  }

  generateReport() {
    const endTime = new Date();
    const totalDuration = endTime - this.startTime;
    
    const report = {
      sessionId: `review-${this.startTime.getTime()}`,
      timestamp: this.startTime.toISOString(),
      duration: totalDuration,
      reviewType: 'comprehensive',
      summary: {
        totalTests: this.results.length,
        passed: this.results.filter(r => r.status === 'pass').length,
        failed: this.results.filter(r => r.status === 'fail').length,
        warnings: this.results.filter(r => r.status === 'warning').length,
        totalIssues: this.issues ? this.issues.length : 0
      },
      testResults: this.results,
      issues: this.issues || [],
      recommendations: this.generateRecommendations()
    };
    
    fs.writeFileSync(this.reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📋 Test Report Generated');
    console.log('='.repeat(50));
    console.log(`📊 Total Tests: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`⚠️  Warnings: ${report.summary.warnings}`);
    console.log(`🐛 Issues: ${report.summary.totalIssues}`);
    console.log(`⏱️  Duration: ${Math.round(totalDuration / 1000)}s`);
    console.log(`📄 Report: ${this.reportFile}`);
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.filter(r => r.status === 'fail').length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'functionality',
        description: 'Address all failing tests before production deployment',
        action: 'Fix failing test cases and verify functionality'
      });
    }
    
    if (this.issues && this.issues.filter(i => i.severity === 'critical').length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'security',
        description: 'Critical security issues must be resolved immediately',
        action: 'Review and fix all critical security vulnerabilities'
      });
    }
    
    return recommendations;
  }
}

// Create screenshots directory
if (!fs.existsSync('screenshots')) {
  fs.mkdirSync('screenshots');
}

module.exports = TestRunner;

// Example usage if run directly
if (require.main === module) {
  const runner = new TestRunner();
  
  // Example test results
  runner.logTest('Wallet Connection', 'Web3 Integration', 'pass', 'MetaMask connection successful', 150);
  runner.logTest('Contract Deployment', 'Smart Contracts', 'pass', 'All contracts deployed successfully', 2500);
  runner.logTest('Token Balance Display', 'Frontend UI', 'warning', 'Balance updates with slight delay', 300);
  
  // Example issue
  runner.logIssue('UI-001', 'medium', 'ux', 'Payment modal could be more responsive', 'frontend/src/components/PaymentModal.tsx:45', 'Add loading spinner during transaction processing');
  
  // Generate report
  setTimeout(() => {
    runner.generateReport();
  }, 1000);
}