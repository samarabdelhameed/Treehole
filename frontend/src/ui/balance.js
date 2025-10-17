import { ethers } from 'ethers'
import { getTokenContract } from '../contracts.js'
import { getUserAddress } from '../wallet.js'

let balanceUpdateInterval = null

export function initBalance() {
  startBalanceUpdates()
}

export function startBalanceUpdates() {
  updateBalance()
  
  // Update balance every 10 seconds
  if (balanceUpdateInterval) {
    clearInterval(balanceUpdateInterval)
  }
  
  balanceUpdateInterval = setInterval(updateBalance, 10000)
}

export function stopBalanceUpdates() {
  if (balanceUpdateInterval) {
    clearInterval(balanceUpdateInterval)
    balanceUpdateInterval = null
  }
}

async function updateBalance() {
  try {
    const tokenContract = getTokenContract()
    const userAddress = getUserAddress()
    const display = document.getElementById('balance-display')
    
    if (!tokenContract || !userAddress) {
      display.textContent = ''
      return
    }
    
    const balance = await tokenContract.balanceOf(userAddress)
    const formattedBalance = ethers.formatEther(balance)
    
    display.textContent = `Balance: ${parseFloat(formattedBalance).toFixed(2)} TEST`
    
  } catch (error) {
    console.error('Failed to update balance:', error)
    const display = document.getElementById('balance-display')
    display.textContent = 'Balance: Error'
  }
}