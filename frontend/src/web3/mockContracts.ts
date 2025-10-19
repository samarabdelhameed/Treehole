// Mock contracts for testing when real contracts are not deployed
import { parseUnits, formatUnits } from 'ethers';

interface MockStorage {
  balances: { [address: string]: string };
  lastClaim: { [address: string]: number };
}

// Simple in-memory storage for mock data
const mockStorage: MockStorage = {
  balances: {},
  lastClaim: {},
};

export class MockTokenContract {
  private address: string;

  constructor(address: string) {
    this.address = address;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async balanceOf(userAddress: string): Promise<bigint> {
    const balance = mockStorage.balances[userAddress] || '0';
    return parseUnits(balance, 18);
  }

  async claimFaucet(): Promise<{ hash: string; wait: () => Promise<any> }> {
    // Get the current user address (this would normally come from the signer)
    const userAddress = Object.keys(mockStorage.balances)[0] || '0x0000000000000000000000000000000000000000';
    
    // Check if user claimed recently (24 hours = 86400000 ms)
    const lastClaim = mockStorage.lastClaim[userAddress] || 0;
    const now = Date.now();
    const timeSinceLastClaim = now - lastClaim;
    
    if (timeSinceLastClaim < 86400000) { // 24 hours
      throw new Error('Already claimed tokens recently. Please wait 24 hours.');
    }

    // Add 1000 tokens to balance
    const currentBalance = parseFloat(mockStorage.balances[userAddress] || '0');
    const newBalance = currentBalance + 1000;
    mockStorage.balances[userAddress] = newBalance.toString();
    mockStorage.lastClaim[userAddress] = now;

    // Return mock transaction
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    
    return {
      hash: mockTxHash,
      wait: async () => ({
        transactionHash: mockTxHash,
        blockNumber: Math.floor(Math.random() * 1000000),
        status: 1,
      }),
    };
  }

  async approve(_spender: string, _amount: bigint): Promise<{ hash: string; wait: () => Promise<any> }> {
    // Mock approval - just return success
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    
    return {
      hash: mockTxHash,
      wait: async () => ({
        transactionHash: mockTxHash,
        blockNumber: Math.floor(Math.random() * 1000000),
        status: 1,
      }),
    };
  }
}

export class MockPaymentSplitterContract {
  private address: string;

  constructor(address: string) {
    this.address = address;
  }

  async getAddress(): Promise<string> {
    return this.address;
  }

  async payAndSplit(
    _tokenAddress: string,
    _listenerAddress: string,
    amount: bigint,
    _extensionSeconds: number
  ): Promise<{ hash: string; wait: () => Promise<any> }> {
    // Mock payment processing
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    
    // Simulate deducting tokens from payer
    const payerAddress = Object.keys(mockStorage.balances)[0];
    if (payerAddress) {
      const currentBalance = parseFloat(mockStorage.balances[payerAddress] || '0');
      const amountToDeduct = parseFloat(formatUnits(amount, 18));
      const newBalance = Math.max(0, currentBalance - amountToDeduct);
      mockStorage.balances[payerAddress] = newBalance.toString();
    }

    return {
      hash: mockTxHash,
      wait: async () => ({
        transactionHash: mockTxHash,
        blockNumber: Math.floor(Math.random() * 1000000),
        status: 1,
      }),
    };
  }

  // Mock event listener
  on(eventName: string, _callback: Function): void {
    // Mock event - don't actually listen to anything
    console.log(`Mock: Listening to ${eventName} events`);
  }

  off(eventName: string, _callback: Function): void {
    // Mock event cleanup
    console.log(`Mock: Stopped listening to ${eventName} events`);
  }
}

export function createMockContracts(testTokenAddress: string, paymentSplitterAddress: string) {
  return {
    testToken: new MockTokenContract(testTokenAddress),
    paymentSplitter: new MockPaymentSplitterContract(paymentSplitterAddress),
  };
}

// Initialize mock balances for testing
export function initializeMockBalance(userAddress: string, initialBalance: string = '0') {
  mockStorage.balances[userAddress] = initialBalance;
}

export function getMockBalance(userAddress: string): string {
  return mockStorage.balances[userAddress] || '0';
}