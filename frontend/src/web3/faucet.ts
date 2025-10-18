import type { Contract } from 'ethers';

const FAUCET_AMOUNT = '1000';

export async function claimFaucet(
  tokenContract: Contract,
  recipientAddress: string
): Promise<any> {
  try {
    const tx = await tokenContract.claimFaucet();
    await tx.wait();
    return tx;
  } catch (error: any) {
    console.error('Error claiming faucet:', error);
    throw new Error(error.message || 'Failed to claim tokens from faucet');
  }
}

export function getFaucetAmount(): string {
  return FAUCET_AMOUNT;
}
