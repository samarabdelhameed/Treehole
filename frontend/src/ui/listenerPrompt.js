export function showListenerPrompt(paymentData) {
  const dialog = document.getElementById('listener-prompt')
  const acceptBtn = document.getElementById('accept-call')
  const declineBtn = document.getElementById('decline-call')
  
  // Update dialog content with payment info
  const content = dialog.querySelector('p')
  content.textContent = `You received ${paymentData.amount} TEST tokens from ${paymentData.payer.slice(0, 6)}...${paymentData.payer.slice(-4)}. Accept the call?`
  
  // Show dialog
  dialog.classList.remove('hidden')
  dialog.classList.add('flex')
  
  // Handle responses
  const handleAccept = () => {
    console.log('Call accepted')
    hideListenerPrompt()
    // Here you would integrate with your calling system
  }
  
  const handleDecline = () => {
    console.log('Call declined')
    hideListenerPrompt()
  }
  
  // Remove existing listeners
  acceptBtn.removeEventListener('click', handleAccept)
  declineBtn.removeEventListener('click', handleDecline)
  
  // Add new listeners
  acceptBtn.addEventListener('click', handleAccept)
  declineBtn.addEventListener('click', handleDecline)
  
  // Auto-hide after 30 seconds
  setTimeout(() => {
    if (!dialog.classList.contains('hidden')) {
      hideListenerPrompt()
    }
  }, 30000)
}

export function hideListenerPrompt() {
  const dialog = document.getElementById('listener-prompt')
  dialog.classList.add('hidden')
  dialog.classList.remove('flex')
}