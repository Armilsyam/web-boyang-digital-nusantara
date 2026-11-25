import { parseEther } from 'viem';

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export const EVM_CHAIN_PARAMS: Record<
  number,
  {
    chainIdHex: string;
    chainName: string;
    rpcUrls: string[];
    nativeCurrency: { name: string; symbol: string; decimals: number };
    blockExplorerUrls: string[];
  }
> = {
  1: {
    chainIdHex: '0x1',
    chainName: 'Ethereum Mainnet',
    rpcUrls: ['https://cloudflare-eth.com'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://etherscan.io'],
  },
  8453: {
    chainIdHex: '0x2105',
    chainName: 'Base Mainnet',
    rpcUrls: ['https://mainnet.base.org'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://basescan.org'],
  },
  137: {
    chainIdHex: '0x89',
    chainName: 'Polygon PoS',
    rpcUrls: ['https://polygon-rpc.com'],
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    blockExplorerUrls: ['https://polygonscan.com'],
  },
  42161: {
    chainIdHex: '0xa4b1',
    chainName: 'Arbitrum One',
    rpcUrls: ['https://arb1.arbitrum.io/rpc'],
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://arbiscan.io'],
  },
  11155111: {
    chainIdHex: '0xaa36a7',
    chainName: 'Sepolia Testnet',
    rpcUrls: ['https://rpc.sepolia.org'],
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
  },
};

export function hasInjectedWallet(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ethereum);
}

export async function connectInjectedWallet(): Promise<{
  address: string;
  chainId: number;
}> {
  if (!window.ethereum) {
    throw new Error(
      'Wallet Web3 (MetaMask / Rabby / OKX Wallet) belum terpasang di browser Anda.'
    );
  }
  const accounts = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('Tidak ada akun wallet yang dipilih.');
  }

  const chainHex = (await window.ethereum.request({
    method: 'eth_chainId',
  })) as string;

  return {
    address: accounts[0],
    chainId: parseInt(chainHex, 16),
  };
}

export async function getConnectedWalletSilent(): Promise<{
  address: string;
  chainId: number;
} | null> {
  if (!window.ethereum) return null;
  try {
    const accounts = (await window.ethereum.request({
      method: 'eth_accounts',
    })) as string[];
    if (!accounts || accounts.length === 0) return null;
    const chainHex = (await window.ethereum.request({
      method: 'eth_chainId',
    })) as string;
    return {
      address: accounts[0],
      chainId: parseInt(chainHex, 16),
    };
  } catch {
    return null;
  }
}

export async function signPersonalMessage(
  address: string,
  message: string
): Promise<string> {
  if (!window.ethereum) {
    throw new Error('Wallet Web3 tidak terdeteksi.');
  }
  const sig = (await window.ethereum.request({
    method: 'personal_sign',
    params: [message, address],
  })) as string;
  return sig;
}

export async function switchToChain(chainId: number) {
  if (!window.ethereum) throw new Error('Wallet Web3 tidak terdeteksi.');
  const target = EVM_CHAIN_PARAMS[chainId];
  const chainIdHex = target ? target.chainIdHex : `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    if (code === 4902 && target) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: target.chainIdHex,
            chainName: target.chainName,
            rpcUrls: target.rpcUrls,
            nativeCurrency: target.nativeCurrency,
            blockExplorerUrls: target.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function sendNativeCryptoPayment(params: {
  fromAddress: string;
  toAddress: string;
  amountTokenStr: string;
  chainId: number;
}): Promise<string> {
  if (!window.ethereum) {
    throw new Error('Wallet Web3 tidak terdeteksi.');
  }
  await switchToChain(params.chainId);
  const weiBigInt = parseEther(params.amountTokenStr);
  const valueHex = `0x${weiBigInt.toString(16)}`;

  const txHash = (await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: params.fromAddress,
        to: params.toAddress,
        value: valueHex,
      },
    ],
  })) as string;

  return txHash;
}
