import type { Contract } from 'ethers';
import { parseUnits } from 'ethers';

const FAUCET_AMOUNT = '1000';

export async function claimFaucet(
  tokenContract: Contract,
  recipientAddress: string
): Promise<any> {
  try {
    const amount = parseUnits(FAUCET_AMOUNT, 18);
    const tx = await tokenContract.mint(recipientAddress, amount);
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
