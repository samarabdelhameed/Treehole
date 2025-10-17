export const CHAINS = {
  anvil: {
    chainId: 31337,
    name: 'Anvil Local',
    rpcUrl: 'http://127.0.0.1:8545',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'SEP',
      decimals: 18
    }
  }
}

export function getChainConfig(chainId) {
  return Object.values(CHAINS).find(chain => chain.chainId === chainId)
}