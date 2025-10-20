import { ethers } from 'ethers';
import { ContractHelpers } from '../utils/contractHelpers.js';
import { globalEventBus, EVENTS } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

// Contract addresses (these should match your deployed contracts)
// IMPORTANT: These are localhost addresses from Hardhat. 
// Update these with your actual deployed contract addresses on Sepolia or other networks
export const CONTRACT_ADDRESSES = {
  // Real deployed contract addresses on Sepolia testnet
  paymentSplitter: '0x76d81731e26889Be3718BEB4d43e12C3692753b8', // PaymentSplitter contract
  testToken: '0xB176c1FA7B3feC56cB23681B6E447A7AE60C5254' // TestToken contract
};

export class ContractsManager {
  constructor() {
    this.signer = null;
    this.paymentSplitter = null;
    this.testToken = null;
    this.isInitialized = false;
    this.logger = logger.child('ContractsManager');
    this.transactionHistory = [];
    this.eventListeners = new Map();
    
    // Transaction status tracking
    this.pendingTransactions = new Map();
    
    // Gas estimation settings
    this.gasSettings = {
      gasLimit: 300000,
      maxFeePerGas: null,
      maxPriorityFeePerGas: null
    };
  }

  async initialize(signer) {
    try {
      this.signer = signer;

      // Try to load contract ABIs, use fallback if not available
      let paymentSplitterABI, testTokenABI;
      
      try {
        paymentSplitterABI = await this.loadABI('/abi/PaymentSplitter.json');
      } catch (error) {
        console.warn('PaymentSplitter ABI not found, using minimal ABI');
        paymentSplitterABI = [
          "function payAndSplit(address token, address listener, uint256 amount, uint256 extensionTimeSeconds) external",
          "event PaymentProcessed(address indexed payer, address indexed listener, uint256 amount, uint256 extensionTimeSeconds)"
        ];
      }

      try {
        testTokenABI = await this.loadABI('/abi/TestToken.json');
      } catch (error) {
        console.warn('TestToken ABI not found, using minimal ERC20 ABI');
        testTokenABI = [
          "function balanceOf(address owner) view returns (uint256)",
          "function approve(address spender, uint256 amount) returns (bool)",
          "function transfer(address to, uint256 amount) returns (bool)",
          "function faucet() external"
        ];
      }

      // Initialize contract instances
      this.paymentSplitter = new ethers.Contract(
        CONTRACT_ADDRESSES.paymentSplitter,
        paymentSplitterABI,
        signer
      );

      this.testToken = new ethers.Contract(
        CONTRACT_ADDRESSES.testToken,
        testTokenABI,
        signer
      );

      // Check if contracts are deployed
      const paymentSplitterDeployed = await ContractHelpers.isContractDeployed(
        signer.provider, 
        CONTRACT_ADDRESSES.paymentSplitter
      );
      const testTokenDeployed = await ContractHelpers.isContractDeployed(
        signer.provider, 
        CONTRACT_ADDRESSES.testToken
      );

      if (!paymentSplitterDeployed) {
        console.warn('PaymentSplitter contract not deployed at:', CONTRACT_ADDRESSES.paymentSplitter);
      }

      if (!testTokenDeployed) {
        console.warn('TestToken contract not deployed at:', CONTRACT_ADDRESSES.testToken);
      }

      // Store deployment status
      this.contractsDeployed = {
        paymentSplitter: paymentSplitterDeployed,
        testToken: testTokenDeployed
      };

      this.isInitialized = true;
      this.logger.info('Contracts initialized successfully', {
        paymentSplitterDeployed,
        testTokenDeployed,
        addresses: CONTRACT_ADDRESSES
      });
      
      globalEventBus.emit(EVENTS.CONTRACT_INITIALIZED, {
        paymentSplitter: paymentSplitterDeployed,
        testToken: testTokenDeployed
      });
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      throw error;
    }
  }

  async loadABI(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ABI from ${path}`);
      }
      const data = await response.json();
      return data.abi || data;
    } catch (error) {
      console.error(`Error loading ABI from ${path}:`, error);
      throw error;
    }
  }

  async getTokenBalance() {
    try {
      if (!this.testToken || !this.signer) {
        throw new Error('Contracts not initialized');
      }

      const address = await this.signer.getAddress();
      
      // Check if contract exists at the address
      const code = await this.signer.provider.getCode(CONTRACT_ADDRESSES.testToken);
      if (code === '0x') {
        console.warn('TestToken contract not deployed at address:', CONTRACT_ADDRESSES.testToken);
        return '0.0'; // Return 0 balance if contract doesn't exist
      }

      const balance = await this.testToken.balanceOf(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Error getting token balance:', error);
      // Return 0 balance on error instead of throwing
      return '0.0';
    }
  }

  async approveTokens(amount) {
    try {
      if (!this.testToken) {
        throw new Error('TestToken contract not initialized');
      }

      this.logger.info('Approving tokens', { amount });
      
      const amountWei = ethers.parseEther(amount.toString());
      
      // Estimate gas
      const gasEstimate = await this.testToken.approve.estimateGas(
        CONTRACT_ADDRESSES.paymentSplitter, 
        amountWei
      );
      
      const tx = await this.testToken.approve(
        CONTRACT_ADDRESSES.paymentSplitter, 
        amountWei,
        { gasLimit: gasEstimate * 120n / 100n } // Add 20% buffer
      );
      
      this.trackTransaction(tx, 'approve', { amount });
      
      const receipt = await tx.wait();
      
      this.logger.info('Tokens approved successfully', { 
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString()
      });
      
      return receipt;
    } catch (error) {
      this.logger.error('Error approving tokens', error);
      throw this.parseContractError(error);
    }
  }

  async payAndSplit(listenerAddress, extensionMinutes, totalCost) {
    try {
      if (!this.paymentSplitter) {
        throw new Error('PaymentSplitter contract not initialized');
      }

      this.logger.info('Processing payment', { 
        listenerAddress, 
        extensionMinutes, 
        totalCost 
      });

      const amountWei = ethers.parseEther(totalCost.toString());
      const extensionSeconds = extensionMinutes * 60;

      // Estimate gas
      const gasEstimate = await this.paymentSplitter.payAndSplit.estimateGas(
        CONTRACT_ADDRESSES.testToken,
        listenerAddress,
        amountWei,
        extensionSeconds
      );

      const tx = await this.paymentSplitter.payAndSplit(
        CONTRACT_ADDRESSES.testToken,
        listenerAddress,
        amountWei,
        extensionSeconds,
        { gasLimit: gasEstimate * 120n / 100n } // Add 20% buffer
      );
      
      this.trackTransaction(tx, 'payAndSplit', { 
        listenerAddress, 
        extensionMinutes, 
        totalCost 
      });
      
      const receipt = await tx.wait();
      
      this.logger.info('Payment processed successfully', { 
        txHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString()
      });
      
      // Return receipt with payment data - let Payment component emit the event
      return {
        ...receipt,
        paymentData: {
          listenerAddress,
          minutes: extensionMinutes,
          extensionMinutes,
          amount: totalCost,
          txHash: receipt.hash
        }
      };
    } catch (error) {
      this.logger.error('Error processing payment', error);
      globalEventBus.emit(EVENTS.PAYMENT_FAILED, this.parseContractError(error));
      throw this.parseContractError(error);
    }
  }

  async claimFaucet() {
    try {
      if (!this.testToken) {
        throw new Error('TestToken contract not initialized');
      }

      // Check if contract exists at the address
      const code = await this.testToken.runner.provider.getCode(CONTRACT_ADDRESSES.testToken);
      if (code === '0x') {
        throw new Error('TestToken contract not deployed. Please deploy contracts first.');
      }

      // Check if claimFaucet function exists
      const hasFunction = this.testToken.interface.hasFunction('claimFaucet');
      if (!hasFunction) {
        throw new Error('claimFaucet function not available on this contract. This might be a production token.');
      }

      const tx = await this.testToken.claimFaucet();
      await tx.wait();
      
      console.log('Faucet claimed successfully');
      return tx;
    } catch (error) {
      console.error('Error claiming faucet:', error);
      const friendlyMessage = ContractHelpers.getContractErrorMessage(error, 'TestToken');
      throw new Error(friendlyMessage);
    }
  }

  async getTokenRatePerMinute() {
    try {
      if (!this.paymentSplitter) {
        throw new Error('PaymentSplitter contract not initialized');
      }

      // For now, return a fixed rate. In a real implementation, 
      // this might be stored in the contract
      return '1.0';
    } catch (error) {
      console.error('Error getting token rate:', error);
      return '1.0'; // Default rate
    }
  }

  parseContractError(error) {
    if (error.code === 4001) {
      return new Error('Transaction cancelled by user');
    }
    
    if (error.message.includes('insufficient funds')) {
      return new Error('Insufficient ETH for gas fees');
    }
    
    if (error.message.includes('ERC20: insufficient allowance')) {
      return new Error('Insufficient token allowance');
    }
    
    if (error.message.includes('ERC20: transfer amount exceeds balance')) {
      return new Error('Insufficient token balance');
    }

    if (error.message.includes('is not a function')) {
      return new Error('Contract function not available. Contract may not be deployed or ABI mismatch.');
    }

    if (error.message.includes('could not decode result data')) {
      return new Error('Contract not deployed or invalid response. Please check contract addresses.');
    }

    // Try to extract revert reason
    if (error.reason) {
      return new Error(`Contract error: ${error.reason}`);
    }

    return new Error(`Transaction failed: ${error.message}`);
  }

  // Event listening methods
  onPaymentProcessed(callback) {
    if (this.paymentSplitter) {
      this.paymentSplitter.on('PaymentProcessed', callback);
    }
  }

  removeAllListeners() {
    if (this.paymentSplitter) {
      this.paymentSplitter.removeAllListeners();
    }
    if (this.testToken) {
      this.testToken.removeAllListeners();
    }
  }

  getContracts() {
    return {
      paymentSplitter: this.paymentSplitter,
      testToken: this.testToken
    };
  }

  areContractsDeployed() {
    return this.contractsDeployed && 
           this.contractsDeployed.paymentSplitter && 
           this.contractsDeployed.testToken;
  }

  getDeploymentStatus() {
    return this.contractsDeployed || {
      paymentSplitter: false,
      testToken: false
    };
  }

  // Transaction tracking
  trackTransaction(tx, type, data = {}) {
    const transaction = {
      hash: tx.hash,
      type,
      data,
      timestamp: Date.now(),
      status: 'pending'
    };
    
    this.transactionHistory.push(transaction);
    this.pendingTransactions.set(tx.hash, transaction);
    
    // Monitor transaction
    tx.wait().then(receipt => {
      transaction.status = 'confirmed';
      transaction.receipt = receipt;
      this.pendingTransactions.delete(tx.hash);
      
      this.logger.info('Transaction confirmed', { 
        hash: tx.hash, 
        type,
        gasUsed: receipt.gasUsed.toString()
      });
    }).catch(error => {
      transaction.status = 'failed';
      transaction.error = error.message;
      this.pendingTransactions.delete(tx.hash);
      
      this.logger.error('Transaction failed', { hash: tx.hash, type, error });
    });
    
    return transaction;
  }

  // Get transaction history
  getTransactionHistory() {
    return [...this.transactionHistory];
  }

  // Get pending transactions
  getPendingTransactions() {
    return Array.from(this.pendingTransactions.values());
  }

  // Check allowance
  async getAllowance(owner = null) {
    try {
      if (!this.testToken || !this.signer) {
        return '0';
      }

      const ownerAddress = owner || await this.signer.getAddress();
      const allowance = await this.testToken.allowance(
        ownerAddress, 
        CONTRACT_ADDRESSES.paymentSplitter
      );
      
      return ethers.formatEther(allowance);
    } catch (error) {
      this.logger.error('Error getting allowance', error);
      return '0';
    }
  }

  // Check if approval is needed
  async needsApproval(amount, owner = null) {
    try {
      const allowance = await this.getAllowance(owner);
      const allowanceNum = parseFloat(allowance);
      const amountNum = parseFloat(amount);
      
      return allowanceNum < amountNum;
    } catch (error) {
      this.logger.error('Error checking approval need', error);
      return true; // Assume approval needed on error
    }
  }

  // Execute payment with automatic approval
  async executePayment(listenerAddress, extensionMinutes, totalCost) {
    try {
      this.logger.info('Executing payment with auto-approval', {
        listenerAddress,
        extensionMinutes,
        totalCost
      });

      // Check if approval is needed
      const needsApproval = await this.needsApproval(totalCost);
      
      if (needsApproval) {
        this.logger.info('Approval needed, requesting approval first');
        await this.approveTokens(totalCost);
      }

      // Execute payment
      return await this.payAndSplit(listenerAddress, extensionMinutes, totalCost);
    } catch (error) {
      this.logger.error('Payment execution failed', error);
      throw error;
    }
  }

  // Get token info
  async getTokenInfo() {
    try {
      if (!this.testToken) {
        return null;
      }

      // Try to get token details (may not be available on all tokens)
      let name = 'Unknown Token';
      let symbol = 'UNK';
      let decimals = 18;

      try {
        name = await this.testToken.name();
      } catch (e) {
        this.logger.debug('Token name not available');
      }

      try {
        symbol = await this.testToken.symbol();
      } catch (e) {
        this.logger.debug('Token symbol not available');
      }

      try {
        decimals = await this.testToken.decimals();
      } catch (e) {
        this.logger.debug('Token decimals not available');
      }

      return { name, symbol, decimals };
    } catch (error) {
      this.logger.error('Error getting token info', error);
      return null;
    }
  }

  // Enhanced event listening with automatic cleanup
  addEventListener(eventName, callback, options = {}) {
    const contract = options.contract || this.paymentSplitter;
    if (!contract) return null;

    const listener = contract.on(eventName, callback);
    const listenerId = Date.now() + Math.random();
    
    this.eventListeners.set(listenerId, {
      contract,
      eventName,
      callback,
      listener
    });

    this.logger.debug('Event listener added', { eventName, listenerId });

    // Return cleanup function
    return () => {
      this.removeEventListener(listenerId);
    };
  }

  // Remove specific event listener
  removeEventListener(listenerId) {
    const listenerInfo = this.eventListeners.get(listenerId);
    if (listenerInfo) {
      listenerInfo.contract.off(listenerInfo.eventName, listenerInfo.callback);
      this.eventListeners.delete(listenerId);
      this.logger.debug('Event listener removed', { listenerId });
    }
  }

  // Enhanced cleanup
  cleanup() {
    this.logger.info('Cleaning up contracts manager');
    
    // Remove all event listeners
    for (const [listenerId] of this.eventListeners) {
      this.removeEventListener(listenerId);
    }
    
    // Clear pending transactions
    this.pendingTransactions.clear();
    
    // Reset state
    this.isInitialized = false;
  }

  // Get contract addresses for current network
  static getContractAddresses(chainId) {
    // In a real app, you might have different addresses per network
    const addressesByNetwork = {
      1: { // Mainnet
        paymentSplitter: '0x...', // Real mainnet address
        testToken: '0x...' // Real mainnet address
      },
      11155111: { // Sepolia
        paymentSplitter: CONTRACT_ADDRESSES.paymentSplitter,
        testToken: CONTRACT_ADDRESSES.testToken
      },
      31337: { // Hardhat
        paymentSplitter: CONTRACT_ADDRESSES.paymentSplitter,
        testToken: CONTRACT_ADDRESSES.testToken
      }
    };

    return addressesByNetwork[chainId] || CONTRACT_ADDRESSES;
  }
}