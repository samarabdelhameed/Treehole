export class UIComponents {
  static createToast(message, type = 'info', duration = 5000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <span>${message}</span>
        <button class="toast-close">×</button>
      </div>
    `;

    // Position toast
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 1000;
      min-width: 300px;
      max-width: 500px;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      animation: slideInRight 0.3s ease-out;
    `;

    // Set colors based on type
    const colors = {
      success: 'bg-green-500/20 border-green-500/50 text-green-100',
      error: 'bg-red-500/20 border-red-500/50 text-red-100',
      warning: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100',
      info: 'bg-blue-500/20 border-blue-500/50 text-blue-100'
    };

    toast.className += ` ${colors[type] || colors.info}`;

    document.body.appendChild(toast);

    // Close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, duration);
    }

    return toast;
  }

  static createModal(title, content, actions = []) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease-out;
    `;

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content glass-card';
    modalContent.style.cssText = `
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      padding: 24px;
      animation: scaleIn 0.3s ease-out;
    `;

    modalContent.innerHTML = `
      <div class="modal-header mb-4">
        <h3 class="text-xl font-bold">${title}</h3>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      ${actions.length > 0 ? `
        <div class="modal-actions flex gap-3 mt-6">
          ${actions.map(action => `
            <button class="${action.className || 'btn-secondary'}" data-action="${action.action}">
              ${action.text}
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // Handle action clicks
    actions.forEach(action => {
      const btn = modalContent.querySelector(`[data-action="${action.action}"]`);
      if (btn && action.handler) {
        btn.addEventListener('click', () => {
          action.handler();
          modal.remove();
        });
      }
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    return modal;
  }

  static createLoadingSpinner(text = 'Loading...') {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = `
      <div class="spinner-container">
        <div class="spinner"></div>
        <span class="spinner-text">${text}</span>
      </div>
    `;

    spinner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(5px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;

    return spinner;
  }

  static createButton(text, onClick, className = 'btn-primary') {
    const button = document.createElement('button');
    button.className = className;
    button.textContent = text;
    button.addEventListener('click', onClick);
    return button;
  }

  static createPaymentDialog(data) {
    return UIComponents.createModal(
      '⚠️ PAYMENT CONFIRMATION',
      `
        <div class="payment-details space-y-4">
          <div class="glass-card p-4">
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-300">Amount:</span>
              <span class="text-yellow-400 font-bold text-xl">${data.amount} THT</span>
            </div>
            <div class="flex justify-between items-center mb-2">
              <span class="text-gray-300">Extension:</span>
              <span class="text-green-400 font-bold">${data.minutes} minutes</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-gray-300">Listener:</span>
              <span class="font-mono text-sm">${data.listener}</span>
            </div>
          </div>
          
          <div class="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3">
            <p class="text-yellow-200 text-sm mb-2">
              This will execute 2 transactions:
            </p>
            <ol class="list-decimal list-inside text-sm text-gray-300 space-y-1">
              <li>Approve tokens for spending</li>
              <li>Process payment and split</li>
            </ol>
          </div>
        </div>
      `,
      [
        {
          text: 'Cancel',
          action: 'cancel',
          className: 'btn-secondary flex-1',
          handler: data.onCancel
        },
        {
          text: 'CONFIRM PAYMENT',
          action: 'confirm',
          className: 'btn-primary flex-1 animate-pulse',
          handler: data.onConfirm
        }
      ]
    );
  }

  static createListenerPrompt(data) {
    return UIComponents.createModal(
      '💰 PAYMENT RECEIVED',
      `
        <div class="payment-notification text-center space-y-4">
          <div class="text-6xl mb-4">💰</div>
          <p class="text-xl">
            You received <span class="text-yellow-400 font-bold">${data.amount} THT</span>
          </p>
          <p class="text-lg text-gray-300">
            For <span class="text-green-400 font-bold">${data.minutes} minutes</span> extension
          </p>
          <p class="text-sm text-gray-400">
            From: <span class="font-mono">${data.payer}</span>
          </p>
          
          <div class="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
            <p class="text-blue-200 text-sm">
              Do you want to accept this payment and extend the timer?
            </p>
          </div>
        </div>
      `,
      [
        {
          text: 'Decline',
          action: 'decline',
          className: 'btn-secondary flex-1',
          handler: data.onDecline
        },
        {
          text: 'Accept Payment',
          action: 'accept',
          className: 'btn-primary flex-1',
          handler: data.onAccept
        }
      ]
    );
  }

  static createTimerDisplay(time) {
    const display = document.createElement('div');
    display.className = 'timer-display text-center';
    display.innerHTML = `
      <div class="text-8xl font-mono font-bold glow-text mb-4">
        ${time.minutes}:${time.seconds}
      </div>
      <div class="text-xl text-gray-300">
        ${time.isRunning ? 'Time Remaining' : 'Ready to Start'}
      </div>
    `;
    return display;
  }
}