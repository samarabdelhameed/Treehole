import type { Contract } from 'ethers';

const FAUCET_AMOUNT = '1000';

export async function claimFaucet(
  tokenContract: Contract,
  recipientAddress: string
): Promise<any> {
  try {
    // First check if the contract exists
    const provider = tokenContract.runner?.provider;
    if (provider) {
      const contractAddress = await tokenContract.getAddress();
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        throw new Error(`TestToken contract not deployed at address: ${contractAddress}. Please check the contract address or deploy the contract first.`);
      }
    }

    // Check current balance (this will also validate the contract)
    let currentBalance;
    try {
      currentBalance = await tokenContract.balanceOf(recipientAddress);
      console.log('Current balance:', currentBalance.toString());
    } catch (balanceError: any) {
      if (balanceError.code === 'BAD_DATA') {
        throw new Error('Contract ABI mismatch or contract not properly deployed. Please check the contract address and ABI.');
      }
      throw balanceError;
    }
    
    // Check if contract has the claimFaucet function
    if (!tokenContract.claimFaucet) {
      throw new Error('Contract does not have claimFaucet function. Please check the contract ABI.');
    }
    
    // Estimate gas first to catch errors early
    let gasEstimate;
    try {
      if (tokenContract.estimateGas && tokenContract.estimateGas.claimFaucet) {
        gasEstimate = await tokenContract.estimateGas.claimFaucet();
        console.log('Gas estimate:', gasEstimate.toString());
      } else {
        // Fallback gas limit if estimation fails
        gasEstimate = 100000n;
        console.log('Using fallback gas estimate:', gasEstimate.toString());
      }
    } catch (gasError: any) {
      console.warn('Gas estimation failed, using fallback:', gasError.message);
      gasEstimate = 100000n;
    }
    
    // Execute the transaction with a bit more gas
    const tx = await tokenContract.claimFaucet({
      gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
    });
    
    console.log('✅ Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('🎉 Transaction confirmed!', {
      hash: receipt.transactionHash || tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });
    
    return tx;
  } catch (error: any) {
    console.error('Error claiming faucet:', error);
    
    // Provide more specific error messages
    if (error.code === 'BAD_DATA') {
      throw new Error('Contract not found or invalid. Please check if the TestToken contract is deployed on Sepolia testnet.');
    } else if (error.message?.includes('Already claimed')) {
      throw new Error('You have already claimed tokens recently. Please wait 24 hours before claiming again.');
    } else if (error.message?.includes('insufficient funds')) {
      throw new Error('Insufficient ETH for gas fees. Please add some Sepolia ETH to your wallet from a faucet.');
    } else if (error.message?.includes('user rejected')) {
      throw new Error('Transaction was rejected by user.');
    } else if (error.message?.includes('execution reverted')) {
      throw new Error('Faucet claim failed. The contract may not be properly configured or you may have already claimed.');
    } else {
      throw new Error(error.message || 'Failed to claim tokens from faucet');
    }
  }
}

export function getFaucetAmount(): string {
  return FAUCET_AMOUNT;
}
