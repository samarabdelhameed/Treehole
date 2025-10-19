import { BrowserProvider } from 'ethers';
import { CONTRACT_ADDRESSES } from '../web3/contracts';

export interface DiagnosticResult {
  check: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export async function runDiagnostics(): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = [];

  // Check MetaMask installation
  if (window.ethereum) {
    results.push({
      check: 'MetaMask Installation',
      status: 'pass',
      message: 'MetaMask is installed and available'
    });
  } else {
    results.push({
      check: 'MetaMask Installation',
      status: 'fail',
      message: 'MetaMask is not installed or not available'
    });
    return results; // Can't continue without MetaMask
  }

  try {
    const provider = new BrowserProvider(window.ethereum);
    
    // Check network
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    
    if (chainId === 11155111) {
      results.push({
        check: 'Network',
        status: 'pass',
        message: 'Connected to Sepolia testnet',
        details: { chainId, name: network.name }
      });
    } else {
      results.push({
        check: 'Network',
        status: 'warning',
        message: `Connected to wrong network (Chain ID: ${chainId})`,
        details: { chainId, name: network.name }
      });
    }

    // Check account connection
    try {
      const accounts = await provider.send('eth_accounts', []);
      if (accounts.length > 0) {
        results.push({
          check: 'Account Connection',
          status: 'pass',
          message: `Connected to account: ${accounts[0]}`,
          details: { account: accounts[0] }
        });

        // Check ETH balance for gas
        const balance = await provider.getBalance(accounts[0]);
        const ethBalance = Number(balance) / 1e18;
        
        if (ethBalance > 0.001) {
          results.push({
            check: 'ETH Balance',
            status: 'pass',
            message: `Sufficient ETH for gas: ${ethBalance.toFixed(4)} ETH`,
            details: { balance: ethBalance }
          });
        } else {
          results.push({
            check: 'ETH Balance',
            status: 'warning',
            message: `Low ETH balance: ${ethBalance.toFixed(4)} ETH. You may need more for gas fees.`,
            details: { balance: ethBalance }
          });
        }
      } else {
        results.push({
          check: 'Account Connection',
          status: 'fail',
          message: 'No accounts connected'
        });
      }
    } catch (error) {
      results.push({
        check: 'Account Connection',
        status: 'fail',
        message: 'Failed to check account connection',
        details: { error: (error as Error).message }
      });
    }

    // Check contract accessibility
    try {
      const code = await provider.getCode(CONTRACT_ADDRESSES.testToken);
      if (code !== '0x') {
        results.push({
          check: 'TestToken Contract',
          status: 'pass',
          message: 'TestToken contract is deployed and accessible',
          details: { address: CONTRACT_ADDRESSES.testToken }
        });
      } else {
        results.push({
          check: 'TestToken Contract',
          status: 'fail',
          message: 'TestToken contract not found at specified address',
          details: { address: CONTRACT_ADDRESSES.testToken }
        });
      }
    } catch (error) {
      results.push({
        check: 'TestToken Contract',
        status: 'fail',
        message: 'Failed to check TestToken contract',
        details: { error: (error as Error).message, address: CONTRACT_ADDRESSES.testToken }
      });
    }

    try {
      const code = await provider.getCode(CONTRACT_ADDRESSES.paymentSplitter);
      if (code !== '0x') {
        results.push({
          check: 'PaymentSplitter Contract',
          status: 'pass',
          message: 'PaymentSplitter contract is deployed and accessible',
          details: { address: CONTRACT_ADDRESSES.paymentSplitter }
        });
      } else {
        results.push({
          check: 'PaymentSplitter Contract',
          status: 'fail',
          message: 'PaymentSplitter contract not found at specified address',
          details: { address: CONTRACT_ADDRESSES.paymentSplitter }
        });
      }
    } catch (error) {
      results.push({
        check: 'PaymentSplitter Contract',
        status: 'fail',
        message: 'Failed to check PaymentSplitter contract',
        details: { error: (error as Error).message, address: CONTRACT_ADDRESSES.paymentSplitter }
      });
    }

  } catch (error: any) {
    results.push({
      check: 'Provider Connection',
      status: 'fail',
      message: 'Failed to connect to Ethereum provider',
      details: { error: (error as Error).message }
    });
  }

  return results;
}

export function formatDiagnosticResults(results: DiagnosticResult[]): string {
  let output = '🔍 TreeHole Diagnostics Report\n';
  output += '================================\n\n';

  results.forEach((result, index) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
    output += `${index + 1}. ${icon} ${result.check}\n`;
    output += `   ${result.message}\n`;
    if (result.details) {
      output += `   Details: ${JSON.stringify(result.details, null, 2)}\n`;
    }
    output += '\n';
  });

  return output;
}