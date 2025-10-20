import { ethers } from 'ethers';
import { globalEventBus, EVENTS } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

export class WalletManager {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.logger = logger.child('WalletManager');
    
    // Supported networks
    this.supportedNetworks = {
      1: { name: 'Ethereum Mainnet', symbol: 'ETH' },
      11155111: { name: 'Sepolia Testnet', symbol: 'ETH' },
      31337: { name: 'Hardhat Local', symbol: 'ETH' },
      1337: { name: 'Ganache Local', symbol: 'ETH' }
    };

    this.setupEventListeners();
  }

  async connect() {
    try {
      this.logger.info('Attempting to connect wallet...');
      
      if (!this.isMetaMaskAvailable()) {
        throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
      }

      this.connectionAttempts++;
      
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please connect your MetaMask wallet.');
      }

      // Initialize provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.address = accounts[0];
      
      // Get chain ID and network info
      const network = await this.provider.getNetwork();
      this.chainId = Number(network.chainId);
      
      // Get ETH balance
      const balance = await this.provider.getBalance(this.address);
      const ethBalance = ethers.formatEther(balance);
      
      this.isConnected = true;
      this.connectionAttempts = 0; // Reset on successful connection

      const walletState = {
        isConnected: true,
        address: this.address,
        chainId: this.chainId,
        balance: ethBalance,
        network: this.getNetworkInfo(this.chainId)
      };

      this.logger.info('Wallet connected successfully', walletState);
      globalEventBus.emit(EVENTS.WALLET_CONNECTED, walletState);

      return walletState;
    } catch (error) {
      this.logger.error('Wallet connection failed', { 
        error: error.message, 
        attempts: this.connectionAttempts 
      });
      
      if (this.connectionAttempts >= this.maxConnectionAttempts) {
        this.logger.error('Max connection attempts reached');
        this.connectionAttempts = 0;
      }
      
      throw this.parseWalletError(error);
    }
  }

  async disconnect() {
    this.logger.info('Disconnecting wallet...');
    
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.chainId = null;
    this.isConnected = false;
    this.connectionAttempts = 0;

    globalEventBus.emit(EVENTS.WALLET_DISCONNECTED);
    this.logger.info('Wallet disconnected');
  }

  async switchToSepolia() {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia testnet
      });
    } catch (switchError) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Testnet',
                nativeCurrency: {
                  name: 'ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io/'],
              },
            ],
          });
        } catch (addError) {
          throw new Error('Failed to add Sepolia network to MetaMask');
        }
      } else {
        throw new Error('Failed to switch to Sepolia network');
      }
    }
  }

  onAccountsChanged(callback) {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback) {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  getSigner() {
    return this.signer;
  }

  getAddress() {
    return this.address;
  }

  getChainId() {
    return this.chainId;
  }

  isWalletConnected() {
    return this.isConnected;
  }

  // Setup event listeners for wallet changes
  setupEventListeners() {
    if (typeof window !== 'undefined' && window.ethereum) {
      // Account changes
      window.ethereum.on('accountsChanged', (accounts) => {
        this.logger.info('Accounts changed', { accounts });
        
        if (accounts.length === 0) {
          this.disconnect();
        } else if (accounts[0] !== this.address) {
          this.address = accounts[0];
          globalEventBus.emit(EVENTS.WALLET_ACCOUNT_CHANGED, accounts);
        }
      });

      // Network changes
      window.ethereum.on('chainChanged', (chainId) => {
        const newChainId = parseInt(chainId, 16);
        this.logger.info('Network changed', { 
          oldChainId: this.chainId, 
          newChainId 
        });
        
        this.chainId = newChainId;
        globalEventBus.emit(EVENTS.WALLET_NETWORK_CHANGED, newChainId);
      });

      // Connection changes
      window.ethereum.on('connect', (connectInfo) => {
        this.logger.info('Wallet connected', connectInfo);
      });

      window.ethereum.on('disconnect', (error) => {
        this.logger.warn('Wallet disconnected', error);
        this.disconnect();
      });
    }
  }

  // Check if MetaMask is available
  isMetaMaskAvailable() {
    return typeof window !== 'undefined' && 
           typeof window.ethereum !== 'undefined' && 
           window.ethereum.isMetaMask;
  }

  // Get network information
  getNetworkInfo(chainId) {
    return this.supportedNetworks[chainId] || {
      name: `Unknown Network (${chainId})`,
      symbol: 'ETH'
    };
  }

  // Check if current network is supported
  isSupportedNetwork(chainId = this.chainId) {
    return chainId in this.supportedNetworks;
  }

  // Get current wallet state
  getWalletState() {
    return {
      isConnected: this.isConnected,
      address: this.address,
      chainId: this.chainId,
      network: this.getNetworkInfo(this.chainId),
      isSupported: this.isSupportedNetwork()
    };
  }

  // Auto-connect if previously connected
  async autoConnect() {
    try {
      if (!this.isMetaMaskAvailable()) {
        return false;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      if (accounts.length > 0) {
        this.logger.info('Auto-connecting to previously connected wallet');
        await this.connect();
        return true;
      }

      return false;
    } catch (error) {
      this.logger.warn('Auto-connect failed', error);
      return false;
    }
  }

  // Get ETH balance
  async getEthBalance(address = this.address) {
    try {
      if (!this.provider || !address) {
        return '0';
      }

      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      this.logger.error('Failed to get ETH balance', error);
      return '0';
    }
  }

  // Add token to MetaMask
  async addToken(tokenAddress, tokenSymbol, tokenDecimals = 18, tokenImage = '') {
    try {
      const wasAdded = await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: tokenAddress,
            symbol: tokenSymbol,
            decimals: tokenDecimals,
            image: tokenImage,
          },
        },
      });

      if (wasAdded) {
        this.logger.info('Token added to MetaMask', { tokenSymbol });
      }

      return wasAdded;
    } catch (error) {
      this.logger.error('Failed to add token to MetaMask', error);
      throw error;
    }
  }

  // Switch to specific network
  async switchNetwork(chainId) {
    try {
      const hexChainId = '0x' + chainId.toString(16);
      
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });

      this.logger.info('Network switched', { chainId });
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Network not added to MetaMask
        throw new Error(`Network ${chainId} is not added to MetaMask`);
      }
      throw error;
    }
  }

  // Parse wallet-specific errors
  parseWalletError(error) {
    if (error.code === 4001) {
      return new Error('Connection rejected by user');
    }
    
    if (error.code === -32002) {
      return new Error('Connection request already pending. Please check MetaMask.');
    }
    
    if (error.message.includes('User rejected')) {
      return new Error('Connection rejected by user');
    }
    
    if (error.message.includes('Already processing')) {
      return new Error('MetaMask is already processing a request');
    }

    return error;
  }

  // Legacy event handlers for backward compatibility
  onAccountsChanged(callback) {
    globalEventBus.on(EVENTS.WALLET_ACCOUNT_CHANGED, callback);
  }

  onChainChanged(callback) {
    globalEventBus.on(EVENTS.WALLET_NETWORK_CHANGED, callback);
  }
}