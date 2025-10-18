import { Contract, formatUnits, parseUnits } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import TestTokenABI from '../../public/abi/TestToken.json';
import PaymentSplitterABI from '../../public/abi/PaymentSplitter.json';

export const CONTRACT_ADDRESSES = {
  testToken: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  paymentSplitter: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
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
    const balance = await tokenContract.balanceOf(address);
    return formatUnits(balance, 18);
  } catch (error) {
    console.error('Error fetching balance:', error);
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
