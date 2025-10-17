import { makePayment } from '../contracts.js'
import { adjustTime } from '../countdown/state.js'

export function initUI() {
  const alarmDialog = document.getElementById('alarm-dialog')
  const confirmBtn = document.getElementById('confirm-payment')
  const cancelBtn = document.getElementById('cancel-payment')
  
  confirmBtn.addEventListener('click', handleConfirmPayment)
  cancelBtn.addEventListener('click', hideAlarmDialog)
  
  // Close dialog on backdrop click
  alarmDialog.addEventListener('click', (e) => {
    if (e.target === alarmDialog) {
      hideAlarmDialog()
    }
  })
}

export function showAlarmDialog() {
  const dialog = document.getElementById('alarm-dialog')
  dialog.classList.remove('hidden')
  dialog.classList.add('flex')
}

export function hideAlarmDialog() {
  const dialog = document.getElementById('alarm-dialog')
  dialog.classList.add('hidden')
  dialog.classList.remove('flex')
}

async function handleConfirmPayment() {
  try {
    const amount = 10 // 10 tokens
    const listener = import.meta.env.VITE_DEFAULT_LISTENER || '0x0000000000000000000000000000000000000000'
    const extensionTime = 600 // 10 minutes
    
    const success = await makePayment(amount, listener, extensionTime)
    
    if (success) {
      // Extend time by 10 minutes
      adjustTime(extensionTime)
      hideAlarmDialog()
    }
    
  } catch (error) {
    console.error('Payment failed:', error)
  }
}