import { ethers } from 'ethers'
import { showToast } from './ui/toast.js'

let provider = null
let signer = null
let userAddress = null

export async function initWallet() {
  const connectButton = document.getElementById('connect-wallet')
  
  connectButton.addEventListener('click', connectWallet)
  
  // Check if already connected
  if (window.ethereum) {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' })
    if (accounts.length > 0) {
      await connectWallet()
    }
  }
}

export async function connectWallet() {
  try {
    if (!window.ethereum) {
      showToast('Please install MetaMask', 'error')
      return
    }

    provider = new ethers.BrowserProvider(window.ethereum)
    await provider.send('eth_requestAccounts', [])
    signer = await provider.getSigner()
    userAddress = await signer.getAddress()
    
    updateUI()
    showToast('Wallet connected successfully', 'success')
    
  } catch (error) {
    console.error('Failed to connect wallet:', error)
    showToast('Failed to connect wallet', 'error')
  }
}

function updateUI() {
  const connectButton = document.getElementById('connect-wallet')
  if (userAddress) {
    connectButton.textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
    connectButton.disabled = true
  }
}

export function getProvider() {
  return provider
}

export function getSigner() {
  return signer
}

export function getUserAddress() {
  return userAddress
}