import { ethers } from 'ethers'
import { getProvider, getSigner } from './wallet.js'
import { showListenerPrompt } from './ui/listenerPrompt.js'
import { showToast } from './ui/toast.js'

let tokenContract = null
let paymentContract = null

export async function initContracts() {
  try {
    const provider = getProvider()
    if (!provider) return

    // Load ABIs (will be synced from contracts)
    const tokenABI = await loadABI('TestToken.json')
    const paymentABI = await loadABI('PaymentSplitter.json')
    
    // Initialize contracts
    const tokenAddress = import.meta.env.VITE_TOKEN_ADDRESS
    const paymentAddress = import.meta.env.VITE_PAYMENT_ADDRESS
    
    if (tokenAddress && paymentAddress) {
      tokenContract = new ethers.Contract(tokenAddress, tokenABI, provider)
      paymentContract = new ethers.Contract(paymentAddress, paymentABI, provider)
      
      // Listen for payment events
      paymentContract.on('PaymentProcessed', handlePaymentProcessed)
    }
    
  } catch (error) {
    console.error('Failed to initialize contracts:', error)
  }
}

async function loadABI(filename) {
  try {
    const response = await fetch(`/abi/${filename}`)
    const data = await response.json()
    return data.abi
  } catch (error) {
    console.error(`Failed to load ABI for ${filename}:`, error)
    return []
  }
}

function handlePaymentProcessed(payer, listener, amount, extensionTime, event) {
  console.log('Payment processed:', { payer, listener, amount, extensionTime })
  
  // Show listener prompt if user is the listener
  const userAddress = getUserAddress()
  if (listener.toLowerCase() === userAddress?.toLowerCase()) {
    showListenerPrompt({
      payer,
      amount: ethers.formatEther(amount),
      extensionTime: extensionTime.toString()
    })
  }
  
  showToast('Payment processed successfully', 'success')
}

export async function makePayment(amount, listener, extensionTime) {
  try {
    const signer = getSigner()
    if (!signer || !tokenContract || !paymentContract) {
      throw new Error('Contracts not initialized')
    }
    
    const tokenWithSigner = tokenContract.connect(signer)
    const paymentWithSigner = paymentContract.connect(signer)
    
    // Approve tokens
    const amountWei = ethers.parseEther(amount.toString())
    const approveTx = await tokenWithSigner.approve(paymentContract.target, amountWei)
    await approveTx.wait()
    
    // Make payment
    const paymentTx = await paymentWithSigner.payAndSplit(amountWei, listener, extensionTime)
    await paymentTx.wait()
    
    showToast('Payment completed successfully', 'success')
    return true
    
  } catch (error) {
    console.error('Payment failed:', error)
    showToast('Payment failed', 'error')
    return false
  }
}

export function getTokenContract() {
  return tokenContract
}

export function getPaymentContract() {
  return paymentContract
}