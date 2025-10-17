// Countdown state management
let countdownState = {
  timeLeft: 0, // seconds
  isRunning: false,
  intervalId: null,
  onExpired: null,
  onTick: null
}

export function getCountdownState() {
  return { ...countdownState }
}

export function setCountdownTime(seconds) {
  countdownState.timeLeft = Math.max(0, seconds)
  if (countdownState.onTick) {
    countdownState.onTick(countdownState.timeLeft)
  }
}

export function startCountdown(onTick, onExpired) {
  if (countdownState.isRunning) return
  
  countdownState.onTick = onTick
  countdownState.onExpired = onExpired
  countdownState.isRunning = true
  
  countdownState.intervalId = setInterval(() => {
    countdownState.timeLeft--
    
    if (countdownState.onTick) {
      countdownState.onTick(countdownState.timeLeft)
    }
    
    if (countdownState.timeLeft <= 0) {
      stopCountdown()
      if (countdownState.onExpired) {
        countdownState.onExpired()
      }
    }
  }, 1000)
}

export function stopCountdown() {
  if (countdownState.intervalId) {
    clearInterval(countdownState.intervalId)
    countdownState.intervalId = null
  }
  countdownState.isRunning = false
}

export function adjustTime(seconds) {
  const newTime = countdownState.timeLeft + seconds
  setCountdownTime(Math.max(0, Math.min(newTime, 15 * 60))) // Max 15 minutes
}

export function getRandomTime() {
  // Random time between 5-15 minutes
  return Math.floor(Math.random() * (15 - 5 + 1) + 5) * 60
}