# Test Accounts Configuration

## Anvil Default Accounts

### Account 1 (Payer/Deployer)
- **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Balance**: 10000 ETH
- **Role**: Primary user, contract deployer

### Account 2 (Listener)
- **Address**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- **Private Key**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`
- **Balance**: 10000 ETH
- **Role**: Listener for payment testing

### Account 3 (Secondary User)
- **Address**: `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC`
- **Private Key**: `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a`
- **Balance**: 10000 ETH
- **Role**: Additional user for multi-user testing

## Contract Addresses

### TestToken Contract
- **Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Symbol**: THT
- **Name**: TreeHole Token
- **Decimals**: 18

### PaymentSplitter Contract
- **Address**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Treasury**: `0x0000000000000000000000000000bAbEdEAdf00d`
- **Split Ratio**: 50/50

## Test Scenarios

### Scenario 1: Single User Flow
1. Connect Account 1 (Payer)
2. Claim faucet tokens
3. Start timer
4. Pay to extend for Account 2 (Listener)

### Scenario 2: Multi-User Interaction
1. Account 1 pays to extend for Account 2
2. Account 2 receives payment notification
3. Timer extends on both accounts

### Scenario 3: Edge Cases
1. Insufficient balance testing
2. Invalid address testing
3. Transaction rejection testing

## Expected Results

### Token Balances After Faucet Claim
- Account 1: 1000 THT
- Account 2: 0 THT (initially)

### Token Balances After Payment (100 THT)
- Account 1: 900 THT (1000 - 100)
- Account 2: 50 THT (50% of 100)
- Treasury: 50 THT (50% of 100)
