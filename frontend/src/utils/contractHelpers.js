/**
 * Contract deployment and validation helpers
 */

export class ContractHelpers {
  /**
   * Check if a contract is deployed at the given address
   */
  static async isContractDeployed(provider, address) {
    try {
      const code = await provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      console.error('Error checking contract deployment:', error);
      return false;
    }
  }

  /**
   * Validate contract addresses format
   */
  static isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get network name from chain ID
   */
  static getNetworkName(chainId) {
    const networks = {
      1: 'Ethereum Mainnet',
      11155111: 'Sepolia Testnet',
      31337: 'Hardhat Local',
      1337: 'Ganache Local'
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
  }

  /**
   * Check if network supports test tokens
   */
  static isTestNetwork(chainId) {
    return [11155111, 31337, 1337].includes(chainId);
  }

  /**
   * Generate helpful error messages for common contract issues
   */
  static getContractErrorMessage(error, contractName) {
    if (error.message.includes('could not decode result data')) {
      return `${contractName} contract not found. Please check the contract address or deploy the contracts.`;
    }
    
    if (error.message.includes('is not a function')) {
      return `Function not available on ${contractName} contract. Check ABI or contract version.`;
    }
    
    if (error.message.includes('insufficient funds')) {
      return 'Insufficient ETH for gas fees. Please add ETH to your wallet.';
    }
    
    return `${contractName} error: ${error.message}`;
  }
}