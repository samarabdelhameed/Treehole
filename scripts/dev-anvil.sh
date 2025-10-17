#!/bin/bash

echo "Starting Anvil local blockchain..."

# Kill any existing anvil process
pkill -f anvil

# Start anvil with deterministic accounts
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --accounts 10 \
  --balance 10000 \
  --gas-limit 30000000 \
  --gas-price 1000000000 \
  --block-time 1 \
  --chain-id 31337