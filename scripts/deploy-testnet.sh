#!/bin/bash

echo "Deploying contracts to testnet..."

cd contracts

# Check if .env exists
if [ ! -f .env ]; then
    echo "Error: .env file not found in contracts directory"
    echo "Please copy .env.example to .env and configure your variables"
    exit 1
fi

# Source environment variables
source .env

# Check required variables
if [ -z "$PRIVATE_KEY" ] || [ -z "$RPC_URL" ] || [ -z "$TREASURY" ]; then
    echo "Error: Missing required environment variables"
    echo "Please ensure PRIVATE_KEY, RPC_URL, and TREASURY are set in .env"
    exit 1
fi

# Build contracts
echo "Building contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

# Deploy contracts
echo "Deploying contracts..."
forge script script/Deploy.s.sol \
    --rpc-url $RPC_URL \
    --private-key $PRIVATE_KEY \
    --broadcast \
    --verify \
    -vvvv

if [ $? -eq 0 ]; then
    echo "Deployment successful!"
    echo "Syncing ABI files..."
    cd ..
    node scripts/sync-abi.js
else
    echo "Deployment failed!"
    exit 1
fi