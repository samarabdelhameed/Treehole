import { 
  startCountdown, 
  stopCountdown, 
  setCountdownTime, 
  adjustTime, 
  getRandomTime,
  getCountdownState 
} from './state.js'
import { showAlarmDialog } from '../ui/dialog.js'

export function initCountdown() {
  const display = document.getElementById('countdown-display')
  const startBtn = document.getElementById('start-timer')
  const resetBtn = document.getElementById('reset-timer')
  const minus10Btn = document.getElementById('minus-10')
  const plus10Btn = document.getElementById('plus-10')
  const extendBtn = document.getElementById('extend-time')
  
  // Event listeners
  startBtn.addEventListener('click', handleStart)
  resetBtn.addEventListener('click', handleReset)
  minus10Btn.addEventListener('click', () => handleAdjust(-600)) // -10 minutes
  plus10Btn.addEventListener('click', () => handleAdjust(600))   // +10 minutes
  extendBtn.addEventListener('click', handleExtend)
  
  // Initialize display
  updateDisplay(0)
}

function handleStart() {
  const state = getCountdownState()
  if (state.timeLeft === 0) {
    setCountdownTime(getRandomTime())
  }
  
  startCountdown(updateDisplay, handleExpired)
  updateButtons()
}

function handleReset() {
  stopCountdown()
  setCountdownTime(getRandomTime())
  updateButtons()
}

function handleAdjust(seconds) {
  adjustTime(seconds)
  updateButtons()
}

function handleExtend() {
  // Show payment dialog for extension
  showAlarmDialog()
}

function handleExpired() {
  updateButtons()
  showAlarmDialog()
}

function updateDisplay(timeLeft) {
  const display = document.getElementById('countdown-display')
  const hours = Math.floor(timeLeft / 3600)
  const minutes = Math.floor((timeLeft % 3600) / 60)
  const seconds = timeLeft % 60
  
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  display.textContent = timeString
  
  // Add expired class if time is up
  if (timeLeft === 0) {
    display.classList.add('countdown-expired')
  } else {
    display.classList.remove('countdown-expired')
  }
}

function updateButtons() {
  const state = getCountdownState()
  const startBtn = document.getElementById('start-timer')
  const resetBtn = document.getElementById('reset-timer')
  
  startBtn.disabled = state.isRunning
  resetBtn.disabled = state.isRunning
}