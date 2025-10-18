import { BrowserProvider, JsonRpcSigner } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletState {
  address: string | null;
  signer: JsonRpcSigner | null;
  chainId: number | null;
  isConnected: boolean;
}

let provider: BrowserProvider | null = null;

export async function connectWallet(): Promise<WalletState> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed!');
  }

  try {
    provider = new BrowserProvider(window.ethereum);

    const accounts = await provider.send('eth_requestAccounts', []);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    return {
      address: accounts[0],
      signer,
      chainId: Number(network.chainId),
      isConnected: true,
    };
  } catch (error: any) {
    console.error('Failed to connect wallet:', error);
    throw new Error(error.message || 'Failed to connect wallet');
  }
}

export async function disconnectWallet(): Promise<void> {
  provider = null;
}

export function getProvider(): BrowserProvider | null {
  return provider;
}

export async function switchToSepoliaNetwork(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed!');
  }

  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0xaa36a7' }],
    });
  } catch (error: any) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0xaa36a7',
            chainName: 'Sepolia Test Network',
            nativeCurrency: {
              name: 'SepoliaETH',
              symbol: 'SEP',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io'],
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

export function onAccountsChanged(callback: (accounts: string[]) => void): void {
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', callback);
  }
}

export function onChainChanged(callback: () => void): void {
  if (window.ethereum) {
    window.ethereum.on('chainChanged', callback);
  }
}
