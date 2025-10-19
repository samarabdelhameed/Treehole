#!/usr/bin/env node

const { ethers } = require('ethers');
const fs = require('fs');

// Configuration
const RPC_URL = 'http://localhost:8545';
const CONTRACTS = {
  testToken: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  paymentSplitter: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6'
};

// ABIs (simplified for monitoring)
const PAYMENT_SPLITTER_ABI = [
  "event PaymentProcessed(address indexed payer, address indexed listener, uint256 amount, uint256 extensionSeconds, uint256 timestamp)"
];

const TEST_TOKEN_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

class EventMonitor {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.paymentSplitter = new ethers.Contract(CONTRACTS.paymentSplitter, PAYMENT_SPLITTER_ABI, this.provider);
    this.testToken = new ethers.Contract(CONTRACTS.testToken, TEST_TOKEN_ABI, this.provider);
    this.logFile = 'event-monitor.log';
    
    console.log('🔍 Event Monitor initialized');
    console.log('📝 Logging to:', this.logFile);
    this.log('Event Monitor Started', { timestamp: new Date().toISOString() });
  }

  log(event, data) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      data
    };
    
    console.log(`[${logEntry.timestamp}] ${event}:`, data);
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
  }

  async startMonitoring() {
    console.log('🚀 Starting event monitoring...');
    
    // Monitor PaymentProcessed events
    this.paymentSplitter.on('PaymentProcessed', (payer, listener, amount, extensionSeconds, timestamp, event) => {
      this.log('PaymentProcessed', {
        payer,
        listener,
        amount: ethers.formatEther(amount),
        extensionMinutes: Number(extensionSeconds) / 60,
        timestamp: Number(timestamp),
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber
      });
    });

    // Monitor Token Transfer events
    this.testToken.on('Transfer', (from, to, value, event) => {
      this.log('TokenTransfer', {
        from,
        to,
        value: ethers.formatEther(value),
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber
      });
    });

    // Monitor Token Approval events
    this.testToken.on('Approval', (owner, spender, value, event) => {
      this.log('TokenApproval', {
        owner,
        spender,
        value: ethers.formatEther(value),
        transactionHash: event.log.transactionHash,
        blockNumber: event.log.blockNumber
      });
    });

    console.log('✅ Event monitoring active');
    console.log('Press Ctrl+C to stop monitoring');
  }

  async getLatestBlock() {
    const block = await this.provider.getBlock('latest');
    this.log('LatestBlock', {
      number: block.number,
      hash: block.hash,
      timestamp: block.timestamp
    });
    return block;
  }

  async checkContractStatus() {
    try {
      const paymentSplitterCode = await this.provider.getCode(CONTRACTS.paymentSplitter);
      const testTokenCode = await this.provider.getCode(CONTRACTS.testToken);
      
      this.log('ContractStatus', {
        paymentSplitter: {
          address: CONTRACTS.paymentSplitter,
          deployed: paymentSplitterCode !== '0x'
        },
        testToken: {
          address: CONTRACTS.testToken,
          deployed: testTokenCode !== '0x'
        }
      });
    } catch (error) {
      this.log('ContractStatusError', { error: error.message });
    }
  }
}

// Main execution
async function main() {
  const monitor = new EventMonitor();
  
  // Check initial status
  await monitor.checkContractStatus();
  await monitor.getLatestBlock();
  
  // Start monitoring
  await monitor.startMonitoring();
  
  // Keep the process running
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping event monitor...');
    monitor.log('Event Monitor Stopped', { timestamp: new Date().toISOString() });
    process.exit(0);
  });
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = EventMonitor;