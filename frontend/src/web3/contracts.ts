import { Contract, formatUnits, parseUnits } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import TestTokenABI from '../abi/TestToken.json';
import PaymentSplitterABI from '../abi/PaymentSplitter.json';
import { quickContractValidation } from '../utils/simpleDebug';

// Sepolia Testnet Contract Addresses - Deployed and Verified ✅
export const CONTRACT_ADDRESSES = {
  testToken: '0xB176c1FA7B3feC56cB23681B6E447A7AE60C5254',
  paymentSplitter: '0x76d81731e26889Be3718BEB4d43e12C3692753b8',
};

// Fallback addresses for testing (if main contracts are not deployed)
export const FALLBACK_ADDRESSES = {
  // These are example addresses - replace with actual deployed contracts
  testToken: '0x0000000000000000000000000000000000000000',
  paymentSplitter: '0x0000000000000000000000000000000000000000',
};

// Network validation
export const SEPOLIA_CHAIN_ID = 11155111;

export function validateNetwork(chainId: number): boolean {
  return chainId === SEPOLIA_CHAIN_ID;
}

export async function validateContracts(signer: JsonRpcSigner): Promise<{
  testToken: boolean;
  paymentSplitter: boolean;
}> {
  const provider = signer.provider;
  
  try {
    const testTokenCode = await provider.getCode(CONTRACT_ADDRESSES.testToken);
    const paymentSplitterCode = await provider.getCode(CONTRACT_ADDRESSES.paymentSplitter);
    
    return {
      testToken: testTokenCode !== '0x',
      paymentSplitter: paymentSplitterCode !== '0x',
    };
  } catch (error) {
    console.error('Error validating contracts:', error);
    return {
      testToken: false,
      paymentSplitter: false,
    };
  }
}

export interface ContractInstances {
  testToken: Contract;
  paymentSplitter: Contract;
}

export function getContracts(signer: JsonRpcSigner): ContractInstances {
  try {
    // Validate ABI imports
    if (!TestTokenABI || !TestTokenABI.abi) {
      throw new Error('TestToken ABI not found or invalid');
    }
    if (!PaymentSplitterABI || !PaymentSplitterABI.abi) {
      throw new Error('PaymentSplitter ABI not found or invalid');
    }

    const testToken = new Contract(
      CONTRACT_ADDRESSES.testToken,
      TestTokenABI.abi,
      signer
    );

    const paymentSplitter = new Contract(
      CONTRACT_ADDRESSES.paymentSplitter,
      PaymentSplitterABI.abi,
      signer
    );

    // Run simple validation in development
    if (process.env.NODE_ENV === 'development') {
      try {
        const isValid = quickContractValidation(testToken, paymentSplitter);
        if (!isValid) {
          console.warn('⚠️ Some contract functions may not work properly');
        }
      } catch (debugError) {
        console.warn('Contract validation failed:', debugError);
      }
    }

    // Validate that contracts have expected functions
    if (!testToken.claimFaucet) {
      console.warn('TestToken contract missing claimFaucet function');
    }
    if (!paymentSplitter.payAndSplit) {
      console.warn('PaymentSplitter contract missing payAndSplit function');
    }

    return { testToken, paymentSplitter };
  } catch (error) {
    console.error('Error creating contracts:', error);
    throw error;
  }
}

export async function getTokenBalance(
  tokenContract: Contract,
  address: string
): Promise<string> {
  try {
    // First check if the contract exists
    const provider = tokenContract.runner?.provider;
    if (provider) {
      const code = await provider.getCode(await tokenContract.getAddress());
      if (code === '0x') {
        console.warn('Contract not deployed at address:', await tokenContract.getAddress());
        return '0';
      }
    }

    const balance = await tokenContract.balanceOf(address);
    return formatUnits(balance, 18);
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    
    // Provide specific error messages
    if (error.code === 'BAD_DATA') {
      console.error('Contract not found or invalid ABI at address:', await tokenContract.getAddress());
    }
    
    return '0';
  }
}

export async function approveTokens(
  tokenContract: Contract,
  spenderAddress: string,
  amount: string
): Promise<any> {
  try {
    const amountWei = parseUnits(amount, 18);
    const tx = await tokenContract.approve(spenderAddress, amountWei);
    await tx.wait();
    return tx;
  } catch (error: any) {
    console.error('Error approving tokens:', error);
    throw new Error(error.message || 'Failed to approve tokens');
  }
}

export async function payAndExtend(
  paymentSplitterContract: Contract,
  tokenContract: Contract,
  listenerAddress: string,
  extensionMinutes: number,
  amount: string
): Promise<any> {
  try {
    const amountWei = parseUnits(amount, 18);
    const extensionSeconds = extensionMinutes * 60;
    
    const tx = await paymentSplitterContract.payAndSplit(
      tokenContract,
      listenerAddress,
      amountWei,
      extensionSeconds
    );
    await tx.wait();
    return tx;
  } catch (error: any) {
    console.error('Error processing payment:', error);
    throw new Error(error.message || 'Failed to process payment');
  }
}

export async function getTokenRatePerMinute(
  paymentSplitterContract: Contract
): Promise<string> {
  // Since the contract doesn't have TOKEN_RATE_PER_MINUTE, we'll return a fixed rate
  return '10';
}
