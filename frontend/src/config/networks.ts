export const NETWORKS = {
  sepolia: {
    chainId: 11155111,
    name: 'Sepolia Test Network',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'SepoliaETH',
      symbol: 'SEP',
      decimals: 18,
    },
    faucets: [
      'https://sepoliafaucet.com/',
      'https://faucet.sepolia.dev/',
    ],
  },
  localhost: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    blockExplorer: '',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

export const SUPPORTED_NETWORKS = [NETWORKS.sepolia.chainId, NETWORKS.localhost.chainId];

export function getNetworkConfig(chainId: number) {
  return Object.values(NETWORKS).find(network => network.chainId === chainId);
}

export function isNetworkSupported(chainId: number): boolean {
  return SUPPORTED_NETWORKS.includes(chainId);
}