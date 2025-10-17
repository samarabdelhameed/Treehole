let toastId = 0

export function initToast() {
  // Toast system is ready
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container')
  const id = ++toastId
  
  const toast = document.createElement('div')
  toast.id = `toast-${id}`
  toast.className = getToastClasses(type)
  toast.innerHTML = `
    <div class="flex items-center">
      <span class="flex-1">${message}</span>
      <button onclick="removeToast(${id})" class="ml-2 text-white hover:text-gray-200">
        ×
      </button>
    </div>
  `
  
  container.appendChild(toast)
  
  // Auto remove after duration
  setTimeout(() => removeToast(id), duration)
  
  return id
}

function getToastClasses(type) {
  const baseClasses = 'mb-2 p-4 rounded-lg shadow-lg text-white max-w-sm transform transition-all duration-300'
  
  const typeClasses = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600'
  }
  
  return `${baseClasses} ${typeClasses[type] || typeClasses.info}`
}

function removeToast(id) {
  const toast = document.getElementById(`toast-${id}`)
  if (toast) {
    toast.classList.add('toast-exit-active')
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 300)
  }
}

// Make removeToast globally available
window.removeToast = removeToast