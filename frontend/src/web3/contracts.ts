import { Contract, formatUnits, parseUnits } from 'ethers';
import type { JsonRpcSigner } from 'ethers';
import TestTokenABI from '../abi/TestToken.json';
import PaymentSplitterABI from '../abi/PaymentSplitter.json';

export const CONTRACT_ADDRESSES = {
  testToken: '0xa513E6E4b8f2a923D98304ec87F64353C4D5C853',
  paymentSplitter: '0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6',
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
