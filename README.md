# EthOnline 2025 - Payment Splitter DApp

A decentralized application for payment splitting with countdown timer functionality.

## Project Structure

- `contracts/` - Foundry (Solidity smart contracts)
- `frontend/` - Vite + Vanilla JS + Tailwind CSS
- `scripts/` - Automation scripts
- `backend/` - Optional backend services (future use)

## Quick Start

### Contracts
```bash
cd contracts
forge build
forge test -vvv
```

### Frontend
```bash
cd frontend
bun install
bun run dev
```

### Local Development
```bash
# Start local blockchain
bash scripts/dev-anvil.sh

# Deploy contracts
bash scripts/deploy-testnet.sh

# Sync ABI files
node scripts/sync-abi.js

# Start frontend
bash scripts/start-web.sh
```

## Environment Setup

Copy `.env.example` to `.env` and configure your variables.

## Security Notes

- Never commit private keys
- Use testnet for development
- Verify all contract interactions