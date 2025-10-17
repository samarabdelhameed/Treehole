import './styles/tailwind-input.css'
import './styles/styles.css'
import { initWallet } from './wallet.js'
import { initContracts } from './contracts.js'
import { initCountdown } from './countdown/countdown.js'
import { initUI } from './ui/dialog.js'
import { initToast } from './ui/toast.js'
import { initBalance } from './ui/balance.js'

// Initialize app
async function init() {
  try {
    // Initialize components
    initToast()
    initUI()
    initBalance()
    initCountdown()
    
    // Initialize wallet and contracts
    await initWallet()
    await initContracts()
    
    console.log('App initialized successfully')
  } catch (error) {
    console.error('Failed to initialize app:', error)
  }
}

// Start the app
init()