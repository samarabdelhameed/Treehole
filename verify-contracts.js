// Script to verify deployed contracts
const { ethers } = require('ethers');
const fs = require('fs');

const SEPOLIA_RPC = 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY';

async function verifyContracts() {
  console.log('🔍 Verifying deployed contracts...');
  
  try {
    // Read deployment summary
    const summary = JSON.parse(fs.readFileSync('./deployment-summary.json', 'utf8'));
    
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
    
    // Check TestToken
    console.log('📄 Checking TestToken...');
    const testTokenCode = await provider.getCode(summary.contracts.testToken.address);
    if (testTokenCode !== '0x') {
      console.log('✅ TestToken is deployed and has code');
      
      // Try to call a function
      const testTokenABI = JSON.parse(fs.readFileSync('./frontend/src/abi/TestToken.json', 'utf8'));
      const testToken = new ethers.Contract(
        summary.contracts.testToken.address,
        testTokenABI.abi,
        provider
      );
      
      try {
        const name = await testToken.name();
        const symbol = await testToken.symbol();
        const faucetAmount = await testToken.FAUCET_AMOUNT();
        
        console.log(\`   Name: \${name}\`);
        console.log(\`   Symbol: \${symbol}\`);
        console.log(\`   Faucet Amount: \${ethers.formatEther(faucetAmount)} tokens\`);
      } catch (error) {
        console.log('⚠️  Could not read TestToken properties:', error.message);
      }
    } else {
      console.log('❌ TestToken has no code - deployment may have failed');
    }
    
    // Check PaymentSplitter
    console.log('📄 Checking PaymentSplitter...');
    const paymentSplitterCode = await provider.getCode(summary.contracts.paymentSplitter.address);
    if (paymentSplitterCode !== '0x') {
      console.log('✅ PaymentSplitter is deployed and has code');
    } else {
      console.log('❌ PaymentSplitter has no code - deployment may have failed');
    }
    
    console.log('🎉 Verification completed!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

if (require.main === module) {
  verifyContracts().catch(console.error);
}

module.exports = { verifyContracts };