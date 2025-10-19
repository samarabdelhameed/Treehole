#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs');

// Test configuration
const RPC_URL = 'http://localhost:8545';
const CONTRACTS = {
  testToken: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  paymentSplitter: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6'
};

// Test accounts from Anvil
const ACCOUNTS = {
  payer: {
    address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    privateKey: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
  },
  listener: {
    address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6'
  }
};

// ABIs (simplified for testing)
const TEST_TOKEN_ABI = [
  "function claimFaucet() external",
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function transfer(address to, uint256 amount) external returns (bool)"
];

const PAYMENT_SPLITTER_ABI = [
  "function payAndSplit(address token, address listener, uint256 amount, uint256 extensionTimeSeconds) external",
  "event PaymentProcessed(address indexed payer, address indexed listener, uint256 amount, uint256 extensionTimeSeconds)"
];

class IntegrationTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.payerWallet = new ethers.Wallet(ACCOUNTS.payer.privateKey, this.provider);
    this.listenerWallet = new ethers.Wallet(ACCOUNTS.listener.privateKey, this.provider);
    
    // Reset nonce tracking
    this.payerWallet.getNonce = async () => {
      return await this.provider.getTransactionCount(this.payerWallet.address, 'pending');
    };
    
    this.testToken = new ethers.Contract(CONTRACTS.testToken, TEST_TOKEN_ABI, this.provider);
    this.paymentSplitter = new ethers.Contract(CONTRACTS.paymentSplitter, PAYMENT_SPLITTER_ABI, this.provider);
    
    this.results = [];
  }

  log(message, data = {}) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data);
    this.results.push({ timestamp, message, data });
  }

  async testStep(stepName, testFunction) {
    try {
      this.log(`🧪 Starting: ${stepName}`);
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      this.log(`✅ Completed: ${stepName}`, { duration: `${duration}ms`, result });
      return result;
    } catch (error) {
      this.log(`❌ Failed: ${stepName}`, { error: error.message });
      throw error;
    }
  }

  async runFullIntegrationTest() {
    this.log('🚀 Starting Full Integration Test');
    
    try {
      // Step 1: Check initial balances
      await this.testStep('Check Initial Balances', async () => {
        const payerBalance = await this.testToken.balanceOf(ACCOUNTS.payer.address);
        const listenerBalance = await this.testToken.balanceOf(ACCOUNTS.listener.address);
        return {
          payer: ethers.formatEther(payerBalance),
          listener: ethers.formatEther(listenerBalance)
        };
      });

      // Step 2: Claim faucet for payer
      await this.testStep('Payer Claims Faucet', async () => {
        const tx = await this.testToken.connect(this.payerWallet).claimFaucet();
        await tx.wait();
        const balance = await this.testToken.balanceOf(ACCOUNTS.payer.address);
        return {
          txHash: tx.hash,
          newBalance: ethers.formatEther(balance)
        };
      });

      // Step 3: Approve payment splitter
      const paymentAmount = ethers.parseEther('100'); // 100 THT
      await this.testStep('Approve Payment Splitter', async () => {
        const nonce = await this.provider.getTransactionCount(this.payerWallet.address, 'pending');
        const tx = await this.testToken.connect(this.payerWallet).approve(CONTRACTS.paymentSplitter, paymentAmount, { nonce });
        await tx.wait();
        return { txHash: tx.hash, amount: ethers.formatEther(paymentAmount) };
      });

      // Step 4: Execute payment and split
      await this.testStep('Execute Payment and Split', async () => {
        const extensionSeconds = 600; // 10 minutes
        const nonce = await this.provider.getTransactionCount(this.payerWallet.address, 'pending');
        const tx = await this.paymentSplitter.connect(this.payerWallet).payAndSplit(
          CONTRACTS.testToken,
          ACCOUNTS.listener.address,
          paymentAmount,
          extensionSeconds,
          { nonce }
        );
        const receipt = await tx.wait();
        
        // Check for PaymentProcessed event
        const event = receipt.logs.find(log => {
          try {
            const parsed = this.paymentSplitter.interface.parseLog(log);
            return parsed.name === 'PaymentProcessed';
          } catch {
            return false;
          }
        });
        
        return {
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          eventEmitted: !!event
        };
      });

      // Step 5: Verify final balances
      await this.testStep('Verify Final Balances', async () => {
        const payerBalance = await this.testToken.balanceOf(ACCOUNTS.payer.address);
        const listenerBalance = await this.testToken.balanceOf(ACCOUNTS.listener.address);
        const splitterBalance = await this.testToken.balanceOf(CONTRACTS.paymentSplitter);
        
        return {
          payer: ethers.formatEther(payerBalance),
          listener: ethers.formatEther(listenerBalance),
          splitter: ethers.formatEther(splitterBalance)
        };
      });

      this.log('🎉 Integration Test Completed Successfully!');
      
    } catch (error) {
      this.log('💥 Integration Test Failed', { error: error.message });
      throw error;
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testType: 'integration',
      results: this.results,
      summary: {
        totalSteps: this.results.filter(r => r.message.includes('Starting:')).length,
        successfulSteps: this.results.filter(r => r.message.includes('Completed:')).length,
        failedSteps: this.results.filter(r => r.message.includes('Failed:')).length
      }
    };
    
    const filename = `integration-test-report-${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Integration Test Report');
    console.log('='.repeat(40));
    console.log(`📄 Report saved to: ${filename}`);
    console.log(`✅ Successful steps: ${report.summary.successfulSteps}`);
    console.log(`❌ Failed steps: ${report.summary.failedSteps}`);
    console.log(`📈 Success rate: ${((report.summary.successfulSteps / report.summary.totalSteps) * 100).toFixed(1)}%`);
    
    return report;
  }
}

// Run the test
async function main() {
  const tester = new IntegrationTester();
  
  try {
    await tester.runFullIntegrationTest();
  } catch (error) {
    console.error('Test execution failed:', error.message);
  } finally {
    tester.generateReport();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IntegrationTester;