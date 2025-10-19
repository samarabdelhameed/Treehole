// Contract debugging utilities
import { Contract } from 'ethers';
import TestTokenABI from '../abi/TestToken.json';
import PaymentSplitterABI from '../abi/PaymentSplitter.json';

export function debugContract(contract: Contract, name: string): void {
  console.group(`🔍 Debugging ${name} Contract`);
  
  try {
    console.log('Contract address:', contract.target);
    
    // Safely check interface functions
    if (contract.interface && contract.interface.functions) {
      console.log('Contract interface functions:', Object.keys(contract.interface.functions));
    } else {
      console.warn('Contract interface or functions not available');
    }
    
    // Check specific functions
    const expectedFunctions = name === 'TestToken' 
      ? ['claimFaucet', 'balanceOf', 'name', 'symbol']
      : ['payAndSplit', 'treasury'];
    
    expectedFunctions.forEach(funcName => {
      const hasFunction = contract[funcName] !== undefined;
      console.log(`${hasFunction ? '✅' : '❌'} ${funcName}:`, hasFunction ? 'Available' : 'Missing');
      
      // Additional check for function type
      if (hasFunction) {
        console.log(`   Type: ${typeof contract[funcName]}`);
      }
    });
    
  } catch (error) {
    console.error('Error debugging contract:', error);
  }
  
  console.groupEnd();
}

export function debugABI(name: string): void {
  console.group(`🔍 Debugging ${name} ABI`);
  
  try {
    const abi = name === 'TestToken' ? TestTokenABI : PaymentSplitterABI;
    
    console.log('ABI loaded:', !!abi);
    console.log('ABI.abi exists:', !!(abi && abi.abi));
    
    if (abi && abi.abi) {
      const functions = abi.abi.filter((item: any) => item.type === 'function');
      console.log('Available functions:', functions.map((f: any) => f.name));
    }
    
  } catch (error) {
    console.error('Error debugging ABI:', error);
  }
  
  console.groupEnd();
}

export function runContractDiagnostics(testToken: Contract, paymentSplitter: Contract): void {
  console.group('🚀 Contract Diagnostics');
  
  // Check if contracts are valid
  if (!testToken) {
    console.error('❌ TestToken contract is null/undefined');
    return;
  }
  if (!paymentSplitter) {
    console.error('❌ PaymentSplitter contract is null/undefined');
    return;
  }
  
  debugABI('TestToken');
  debugABI('PaymentSplitter');
  debugContract(testToken, 'TestToken');
  debugContract(paymentSplitter, 'PaymentSplitter');
  
  console.groupEnd();
}