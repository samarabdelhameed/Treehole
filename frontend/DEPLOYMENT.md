# Contract Deployment Guide

## Quick Fix for Current Errors

The errors you're seeing are because the contract addresses in `src/web3/contracts.js` point to localhost addresses that don't exist on the actual network.

### Option 1: Update Contract Addresses (Recommended)

1. Deploy your contracts to Sepolia testnet
2. Update the addresses in `src/web3/contracts.js`:

```javascript
export const CONTRACT_ADDRESSES = {
  paymentSplitter: 'YOUR_DEPLOYED_PAYMENT_SPLITTER_ADDRESS',
  testToken: 'YOUR_DEPLOYED_TEST_TOKEN_ADDRESS'
};
```

### Option 2: Use Demo Mode

The app now gracefully handles missing contracts and will show:
- "Contracts not deployed" warnings
- Disabled faucet button
- 0.0 token balance
- Helpful error messages

### Option 3: Deploy Locally

If you have Hardhat setup:

1. Start local node: `npx hardhat node`
2. Deploy contracts: `npx hardhat run scripts/deploy.js --network localhost`
3. Update contract addresses with the deployed addresses

## Contract Requirements

Your contracts should have these functions:

### TestToken Contract
- `balanceOf(address) returns (uint256)`
- `approve(address, uint256) returns (bool)`
- `faucet()` - for test token distribution

### PaymentSplitter Contract
- `payAndSplit(address listener, uint256 amount, uint256 extensionSeconds)`
- Event: `PaymentProcessed(address indexed payer, address indexed listener, uint256 amount, uint256 extensionSeconds)`

## Network Support

- **Sepolia Testnet** (Chain ID: 11155111) - Recommended for testing
- **Hardhat Local** (Chain ID: 31337) - For local development
- **Ganache** (Chain ID: 1337) - Alternative local development

## Troubleshooting

1. **"could not decode result data"** - Contract not deployed at the specified address
2. **"faucet is not a function"** - Contract doesn't have faucet function or ABI mismatch
3. **"insufficient funds"** - Need ETH for gas fees
4. **Network mismatch** - Switch to Sepolia testnet in MetaMask