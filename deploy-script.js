// Script to deploy contracts to Sepolia testnet
const { ethers } = require('ethers');
const fs = require('fs');

// Configuration
const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY'; // Never commit this!

async function deployContracts() {
  console.log('🚀 Starting contract deployment to Sepolia...');
  
  // Connect to Sepolia
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log('📍 Deploying from address:', wallet.address);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log('💰 Balance:', ethers.formatEther(balance), 'ETH');
  
  if (parseFloat(ethers.formatEther(balance)) < 0.01) {
    console.error('❌ Insufficient balance! Need at least 0.01 ETH for deployment');
    return;
  }
  
  try {
    // Load contract ABIs and bytecode
    const testTokenABI = JSON.parse(fs.readFileSync('./frontend/src/abi/TestToken.json', 'utf8'));
    const paymentSplitterABI = JSON.parse(fs.readFileSync('./frontend/src/abi/PaymentSplitter.json', 'utf8'));
    
    // Deploy TestToken
    console.log('📄 Deploying TestToken...');
    const TestTokenFactory = new ethers.ContractFactory(
      testTokenABI.abi,
      testTokenABI.bytecode,
      wallet
    );
    
    const testToken = await TestTokenFactory.deploy();
    await testToken.waitForDeployment();
    const testTokenAddress = await testToken.getAddress();
    
    console.log('✅ TestToken deployed at:', testTokenAddress);
    
    // Deploy PaymentSplitter
    console.log('📄 Deploying PaymentSplitter...');
    const PaymentSplitterFactory = new ethers.ContractFactory(
      paymentSplitterABI.abi,
      paymentSplitterABI.bytecode,
      wallet
    );
    
    const paymentSplitter = await PaymentSplitterFactory.deploy(testTokenAddress);
    await paymentSplitter.waitForDeployment();
    const paymentSplitterAddress = await paymentSplitter.getAddress();
    
    console.log('✅ PaymentSplitter deployed at:', paymentSplitterAddress);
    
    // Update contract addresses in the frontend
    const contractsContent = `// Sepolia Testnet Contract Addresses - Auto-generated
export const CONTRACT_ADDRESSES = {
  testToken: '${testTokenAddress}',
  paymentSplitter: '${paymentSplitterAddress}',
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
}`;

    // Write the rest of the contracts.ts file content
    const restOfFile = `
import { Contract, formatUnits, parseUnits } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import TestTokenABI from '../abi/TestToken.json';
import PaymentSplitterABI from '../abi/PaymentSplitter.json';

// Fallback addresses for testing (if main contracts are not deployed)
export const FALLBACK_ADDRESSES = {
  // These are example addresses - replace with actual deployed contracts
  testToken: '0x0000000000000000000000000000000000000000',
  paymentSplitter: '0x0000000000000000000000000000000000000000',
};

export interface ContractInstances {
  testToken: Contract;
  paymentSplitter: Contract;
}

export function getContracts(signer: JsonRpcSigner): ContractInstances {
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

  return { testToken, paymentSplitter };
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
}`;

    fs.writeFileSync('./frontend/src/web3/contracts.ts', contractsContent + restOfFile);
    
    console.log('📝 Updated frontend/src/web3/contracts.ts with new addresses');
    
    // Create deployment summary
    const summary = {
      network: 'Sepolia Testnet',
      chainId: 11155111,
      deployedAt: new Date().toISOString(),
      contracts: {
        testToken: {
          address: testTokenAddress,
          txHash: testToken.deploymentTransaction()?.hash
        },
        paymentSplitter: {
          address: paymentSplitterAddress,
          txHash: paymentSplitter.deploymentTransaction()?.hash
        }
      },
      deployer: wallet.address
    };
    
    fs.writeFileSync('./deployment-summary.json', JSON.stringify(summary, null, 2));
    
    console.log('🎉 Deployment completed successfully!');
    console.log('📋 Summary saved to deployment-summary.json');
    console.log('🔗 View on Etherscan:');
    console.log(\`   TestToken: https://sepolia.etherscan.io/address/\${testTokenAddress}\`);
    console.log(\`   PaymentSplitter: https://sepolia.etherscan.io/address/\${paymentSplitterAddress}\`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
  }
}

// Run deployment
if (require.main === module) {
  deployContracts().catch(console.error);
}

module.exports = { deployContracts };