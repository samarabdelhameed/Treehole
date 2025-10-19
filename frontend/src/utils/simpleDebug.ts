// Simple contract debugging without complex interface checks
import { Contract } from 'ethers';

export function simpleContractCheck(contract: Contract, name: string): boolean {
  console.group(`🔍 Simple ${name} Check`);
  
  try {
    // Basic checks
    const hasAddress = !!contract.target;
    const hasRunner = !!contract.runner;
    
    console.log(`Address: ${contract.target}`);
    console.log(`Has runner: ${hasRunner}`);
    
    // Function checks
    const expectedFunctions = name === 'TestToken' 
      ? ['claimFaucet', 'balanceOf', 'name', 'symbol']
      : ['payAndSplit', 'treasury'];
    
    let allFunctionsExist = true;
    expectedFunctions.forEach(funcName => {
      const exists = typeof contract[funcName] === 'function';
      console.log(`${exists ? '✅' : '❌'} ${funcName}: ${exists ? 'OK' : 'Missing'}`);
      if (!exists) allFunctionsExist = false;
    });
    
    console.log(`Overall status: ${allFunctionsExist ? '✅ Ready' : '❌ Issues found'}`);
    console.groupEnd();
    
    return allFunctionsExist;
    
  } catch (error) {
    console.error(`Error checking ${name}:`, error);
    console.groupEnd();
    return false;
  }
}

export function quickContractValidation(testToken: Contract, paymentSplitter: Contract): boolean {
  console.log('🚀 Quick Contract Validation');
  
  const testTokenOK = simpleContractCheck(testToken, 'TestToken');
  const paymentSplitterOK = simpleContractCheck(paymentSplitter, 'PaymentSplitter');
  
  const allOK = testTokenOK && paymentSplitterOK;
  console.log(`\n🎯 Final Result: ${allOK ? '✅ All contracts ready!' : '❌ Some contracts have issues'}`);
  
  return allOK;
}