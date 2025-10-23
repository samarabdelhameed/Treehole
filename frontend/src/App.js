import { WalletManager } from './web3/wallet.js';
import { ContractsManager } from './web3/contracts.js';
import { EventManager } from './web3/events.js';
import { TimerComponent } from './components/Timer.js';
import { TimerUI } from './components/TimerUI.js';
import { TimerExtensions } from './components/TimerExtensions.js';
import { PaymentComponent } from './components/Payment.js';
import { UIComponents } from './components/UI.js';
import { VoiceChatManager } from './components/VoiceChat.js';
import { StorageManager } from './utils/storage.js';
import { SoundManager } from './utils/sounds.js';
import { createStateManager } from './utils/stateManager.js';
import { globalEventBus, EVENTS, createEventEmitter } from './utils/eventBus.js';
import { logger, performanceMonitor, withLogging } from './utils/logger.js';
import { multiaddr } from "@multiformats/multiaddr";
import { enable, disable } from "@libp2p/logger";
import { PUBSUB_AUDIO } from "./utils/constants.js";
import { update, getPeerTypes, getAddresses, getPeerDetails } from "./utils/streaming_utils.js";
import { createNewLibp2p } from "./utils/streaming_utils.js";
import { peerApp, setSourceBuffer, setBufferReady } from './peerApp.js';
let sourceBuffer = null;
  let queue = [];
  let isBufferReady = false;
  let isAppending = false;
  function appendNextChunk() {
    if (!isBufferReady || !sourceBuffer || isAppending || queue.length === 0 || sourceBuffer.updating) return;
    const chunk = queue.shift();
    if (!chunk) return;

    try {
      isAppending = true;
      sourceBuffer.appendBuffer(chunk);
    } catch (e) {
      console.warn("appendBuffer failed:", e);
    } finally {
      isAppending = false;
    }
  }

export class TreeHoleApp {
  constructor() {
    // Initialize state with default values
    this.state = this.getInitialState();
    
    // Initialize managers and components
    this.initializeManagers();
    
    // Bind methods to preserve context
    this.bindMethods();
    
    // Setup lifecycle hooks
    this.setupLifecycleHooks();
  }

  getInitialState() {
    return {
      wallet: {
        isConnected: false,
        address: null,
        chainId: null,
        balance: '0'
      },
      timer: {
        seconds: 900, // 15 minutes default
        isRunning: false
      },
      payment: {
        listenerAddress: '',
        extensionMinutes: 10
      },
      voiceChat: {
        isConnected: false,
        localStream: null,
        remoteStream: null
      },
      ui: {
        isLoading: false,
        toasts: [],
        currentView: 'main'
      },
      app: {
        isInitialized: false,
        version: '1.0.0',
        lastActivity: Date.now()
      }
    };
  }

  initializeManagers() {
    console.log('Initializing app managers...');



    this.storageManager = new StorageManager();
    
    // Initialize event bus for this app instance
    this.eventBus = createEventEmitter('app');
    
    // Initialize state manager with persistence
    this.stateManager = createStateManager(this.getInitialState(), {
      persistence: {
        storage: {
          setItem: (key, value) => this.storageManager.saveState(JSON.parse(value)),
          getItem: (key) => {
            const state = this.storageManager.loadState();
            return state ? JSON.stringify(state) : null;
          }
        }
      }
    });

    // Subscribe to state changes
    this.stateManager.subscribe((newState, prevState, action) => {
      this.state = newState;
      this.render();
    });

    this.walletManager = new WalletManager();
    this.contractsManager = new ContractsManager();
    this.eventManager = new EventManager();
    this.timerComponent = new TimerComponent();
    // Initialize timer extensions after contracts manager is ready
    this.timerExtensions = null;
    this.paymentComponent = new PaymentComponent(this.contractsManager);
    this.uiComponents = new UIComponents();
    this.voiceChatManager = new VoiceChatManager();
    this.soundManager = new SoundManager();

 
  }

  bindMethods() {
    this.updateState = this.updateState.bind(this);
    this.render = this.render.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleStateChange = this.handleStateChange.bind(this);
  }

  setupLifecycleHooks() {
    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });

    // Setup visibility change handling
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.handleAppHidden();
      } else {
        this.handleAppVisible();
      }
    });

    // Setup error handling
    window.addEventListener('error', (event) => {
      this.handleError(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason);
    });
  }

  async init() {

    return performanceMonitor.measure('app:init', async () => {
      try {
        peerApp();
       
        logger.info('Initializing TreeHole application...');
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Initialize components
        await this.initializeComponents();
        
        // Render initial UI
        this.render();
        
        // Mark as initialized
        this.updateState({ 
          app: { ...this.state.app, isInitialized: true } 
        }, 'APP_INITIALIZED');
        
        globalEventBus.emit(EVENTS.APP_INITIALIZED);
        logger.info('TreeHole app initialized successfully');
        
      } catch (error) {
        logger.error('Failed to initialize app', error);
        globalEventBus.emit(EVENTS.APP_ERROR, error);
        this.showToast('Failed to initialize application', 'error');
        throw error;
      }
    });
  }

  setupEventListeners() {
    // Global event listeners
    globalEventBus.on(EVENTS.WALLET_CONNECTED, (walletState) => {
      this.updateState({ wallet: walletState }, 'WALLET_CONNECTED');
      this.showToast('Wallet connected successfully!', 'success');
    });

    globalEventBus.on(EVENTS.WALLET_DISCONNECTED, () => {
      this.updateState({
        wallet: {
          isConnected: false,
          address: null,
          chainId: null,
          balance: '0'
        }
      }, 'WALLET_DISCONNECTED');
      this.showToast('Wallet disconnected', 'info');
    });

    globalEventBus.on(EVENTS.WALLET_ACCOUNT_CHANGED, (accounts) => {
      if (accounts.length === 0) {
        globalEventBus.emit(EVENTS.WALLET_DISCONNECTED);
      } else {
        this.handleWalletChange(accounts[0]);
      }
    });

    globalEventBus.on(EVENTS.WALLET_NETWORK_CHANGED, () => {
      window.location.reload();
    });

    // Timer events
    globalEventBus.on(EVENTS.TIMER_TICK, (seconds) => {
      this.updateState({ timer: { ...this.state.timer, seconds } }, 'TIMER_TICK');
    });

    globalEventBus.on(EVENTS.TIMER_ENDED, () => {
      this.soundManager.playTimerEnd();
      this.showToast('Time is up!', 'warning');
      this.updateState({ timer: { ...this.state.timer, isRunning: false } }, 'TIMER_ENDED');
    });

    globalEventBus.on(EVENTS.TIMER_STARTED, () => {
      this.updateState({ timer: { ...this.state.timer, isRunning: true } }, 'TIMER_STARTED');
      this.showToast('Timer started!', 'info');
    });

    globalEventBus.on(EVENTS.TIMER_PAUSED, () => {
      this.updateState({ timer: { ...this.state.timer, isRunning: false } }, 'TIMER_PAUSED');
      this.showToast('Timer paused', 'info');
    });

    globalEventBus.on(EVENTS.TIMER_EXTENDED, (data) => {
      this.showToast(`Timer extended by ${data.minutes} minutes`, 'success');
    });

    // Payment events
    globalEventBus.on(EVENTS.PAYMENT_SUCCESS, (data) => {
      this.showToast(`Payment successful! Extended ${data.minutes} minutes`, 'success');
      // Don't emit TIMER_EXTENDED here - it's already handled by TimerExtensions
      this.updateBalance();
    });

    globalEventBus.on(EVENTS.PAYMENT_FAILED, (error) => {
      this.showToast(error.message, 'error');
    });

    // Voice chat events
    globalEventBus.on(EVENTS.VOICE_CHAT_CONNECTED, () => {
      this.updateState({ 
        voiceChat: { ...this.state.voiceChat, isConnected: true } 
      }, 'VOICE_CHAT_CONNECTED');
      this.showToast('Voice chat connected', 'success');
    });

    globalEventBus.on(EVENTS.VOICE_CHAT_DISCONNECTED, () => {
      this.updateState({ 
        voiceChat: { ...this.state.voiceChat, isConnected: false } 
      }, 'VOICE_CHAT_DISCONNECTED');
      this.showToast('Voice chat disconnected', 'warning');
    });

    // Contract events
    globalEventBus.on(EVENTS.TOKEN_BALANCE_UPDATED, (balance) => {
      this.updateState({ 
        wallet: { ...this.state.wallet, balance } 
      }, 'TOKEN_BALANCE_UPDATED');
    });

    // UI events
    globalEventBus.on(EVENTS.UI_LOADING_START, (message) => {
      this.updateState({ 
        ui: { ...this.state.ui, isLoading: true } 
      }, 'UI_LOADING_START');
    });

    globalEventBus.on(EVENTS.UI_LOADING_END, () => {
      this.updateState({ 
        ui: { ...this.state.ui, isLoading: false } 
      }, 'UI_LOADING_END');
    });

    // Legacy component events (for backward compatibility)
    this.setupLegacyEventListeners();
  }

  setupLegacyEventListeners() {
    // Wallet events
    this.walletManager.onAccountsChanged((accounts) => {
      globalEventBus.emit(EVENTS.WALLET_ACCOUNT_CHANGED, accounts);
    });

    this.walletManager.onChainChanged(() => {
      globalEventBus.emit(EVENTS.WALLET_NETWORK_CHANGED);
    });

    // Timer events
    this.timerComponent.onTick((seconds) => {
      globalEventBus.emit(EVENTS.TIMER_TICK, seconds);
    });

    this.timerComponent.onTimeUp(() => {
      globalEventBus.emit(EVENTS.TIMER_ENDED);
    });

    // Payment events - PaymentComponent already emits PAYMENT_SUCCESS
    this.paymentComponent.onPaymentSuccess((data) => {
      try {
        // Don't emit again - PaymentComponent.handlePaymentSuccess already emits this
        if (data && data.paymentId) {
          console.log('Payment transaction completed', { paymentId: data.paymentId });
        }
      } catch (error) {
        console.error('Error in payment success callback:', error);
      }
    });

    this.paymentComponent.onPaymentError((error) => {
      globalEventBus.emit(EVENTS.PAYMENT_FAILED, error);
    });

    // Voice chat events
    this.voiceChatManager.onConnectionEstablished(() => {
      globalEventBus.emit(EVENTS.VOICE_CHAT_CONNECTED);
    });

    this.voiceChatManager.onConnectionLost(() => {
      globalEventBus.emit(EVENTS.VOICE_CHAT_DISCONNECTED);
    });
  }

  async initializeComponents() {
    // Initialize timer with random duration
    this.timerComponent.generateRandomDuration();
    
    // Initialize sound manager
    this.soundManager.init();
    
    // Initialize storage
    this.storageManager.init();
  }

  updateState(newState, action = 'UPDATE_STATE') {
    if (this.stateManager) {
      this.stateManager.setState(newState, action);
    } else {
      // Fallback for initialization
      this.state = { ...this.state, ...newState };
      this.render();
    }
  }

  render() {
    const rootElement = document.getElementById('root');
    if (!rootElement) return;

    rootElement.innerHTML = this.generateHTML();
    this.attachEventListeners();
  }

  generateHTML() {
    return `
      <div class="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white relative overflow-hidden">
        <div class="stars-bg absolute inset-0"></div>
        
        <div class="relative z-10">
          ${this.renderHeader()}
          ${this.renderMain()}
        </div>
        
        ${this.renderToasts()}
      </div>
    `;
  }

  renderHeader() {
    return `
      <header class="p-6 flex justify-between items-center backdrop-blur-sm bg-black/20 border-b border-purple-500/30">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-orange-500 flex items-center justify-center glow-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12,6 12,12 16,14"/>
            </svg>
          </div>
          <h1 class="text-3xl font-bold glow-text">TreeHole</h1>
        </div>

        ${this.state.wallet.isConnected ? this.renderConnectedWallet() : this.renderConnectButton()}
      </header>
    `;
  }

  renderConnectButton() {
    return `
    <div id="streaming-app-root">
    </div>
      <button id="connect-wallet" class="btn-primary animate-pulse-slow" ${this.state.ui.isLoading ? 'disabled' : ''}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="5" width="18" height="14" rx="2"/>
          <line x1="3" y1="11" x2="21" y2="11"/>
          <line x1="12" y1="17" x2="12" y2="17"/>
        </svg>
        ${this.state.ui.isLoading ? 'Connecting...' : 'Connect Wallet'}
      </button>
    `;
  }

  renderConnectedWallet() {
    return `
      <div class="flex items-center gap-4">
        <div class="glass-card px-4 py-2 flex items-center gap-2">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-yellow-400">
            <circle cx="8" cy="8" r="6"/>
            <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
            <path d="M7 6h1v4"/>
            <path d="M16.71 13.88L18.29 15.46"/>
          </svg>
          <span class="font-mono font-bold">${parseFloat(this.state.wallet.balance).toFixed(2)} THT</span>
        </div>
        <div class="glass-card px-4 py-2">
          <span class="text-sm text-gray-300">
            ${this.state.wallet.address ? 
              `${this.state.wallet.address.slice(0, 6)}...${this.state.wallet.address.slice(-4)}` : 
              'Not connected'
            }
          </span>
        </div>
        <button id="disconnect-wallet" class="btn-secondary">Disconnect</button>
      </div>
    `;
  }

  renderMain() {
    if (!this.state.wallet.isConnected) {
      return this.renderWelcomeScreen();
    }
    
    return `
      <main class="container mx-auto px-4 py-12">
        <div class="grid lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 flex flex-col items-center justify-center">
            ${this.renderTimerSection()}
          </div>
          <div class="space-y-6">
            ${this.renderFaucetSection()}
            ${this.renderPaymentSection()}
            ${this.renderVoiceChatSection()}
          </div>
        </div>
      </main>
    `;
  }

  renderWelcomeScreen() {
    return `
      <main class="container mx-auto px-4 py-12">
        <div class="flex flex-col items-center justify-center min-h-[70vh] text-center">
          <div class="glass-card p-12 max-w-2xl animate-fadeIn">
            <h2 class="text-5xl font-bold mb-6 glow-text">
              Pay to Listen. Pay to Extend Time.
            </h2>
            <p class="text-xl text-gray-300 mb-8">
              Connect your wallet to start your listening session with P2P voice chat
            </p>
            <button id="welcome-connect" class="btn-primary text-xl px-8 py-4 animate-pulse-slow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="5" width="18" height="14" rx="2"/>
                <line x1="3" y1="11" x2="21" y2="11"/>
                <line x1="12" y1="17" x2="12" y2="17"/>
              </svg>
              Start Listening Session
            </button>
          </div>
        </div>
      </main>
    `;
  }

  renderTimerSection() {
    const minutes = Math.floor(this.state.timer.seconds / 60);
    const seconds = this.state.timer.seconds % 60;
    
    return `
      <div class="glass-card p-12 w-full text-center">
        <div class="timer-display mb-8">
          <div class="text-8xl font-mono font-bold glow-text">
            ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}
          </div>
          <div class="text-xl text-gray-300 mt-2">
            ${this.state.timer.isRunning ? 'Time Remaining' : 'Ready to Start'}
          </div>
        </div>

        <div class="flex gap-4 justify-center">
          ${!this.state.timer.isRunning ? 
            '<button id="start-timer" class="btn-primary">Start Timer</button>' :
            '<button id="pause-timer" class="btn-secondary">Pause</button>'
          }
          <button id="reset-timer" class="btn-secondary">Reset</button>
        </div>
    
      </div>
    `;
  }

  renderFaucetSection() {
    const isCorrectNetwork = this.state.wallet.chainId === 11155111;
    const contractsDeployed = this.contractsManager.areContractsDeployed();
    
    return `
      <div class="glass-card p-6">
        <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-400">
            <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
            <path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2.04 4.6 4.14 5.78s3.86 2.66 3.86 4.78c0 1.33-.84 2.44-2 2.94"/>
          </svg>
          Get Test Tokens
        </h3>
        <p class="text-gray-300 mb-4">
          Claim 100 THT tokens for testing
        </p>
        
        ${!isCorrectNetwork ? `
          <div class="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-3 mb-4">
            <p class="text-yellow-200 text-sm mb-2">
              ⚠️ Please switch to Sepolia testnet to claim tokens
            </p>
            <button id="switch-network" class="btn-secondary text-sm w-full">
              Switch to Sepolia
            </button>
          </div>
        ` : !contractsDeployed ? `
          <div class="bg-orange-500/20 border border-orange-500/50 rounded-lg p-3 mb-4">
            <p class="text-orange-200 text-sm mb-2">
              ⚠️ Contracts not deployed. Deploy contracts first or use demo mode.
            </p>
          </div>
        ` : ''}
        
        <button id="claim-faucet" class="btn-primary w-full shine-effect" 
                ${this.state.ui.isLoading || !isCorrectNetwork || !contractsDeployed ? 'disabled' : ''}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/>
          </svg>
          ${this.state.ui.isLoading ? 'Claiming...' : 'Claim Faucet'}
        </button>
        
        <p class="text-xs text-gray-400 mt-2">
          Network: ${isCorrectNetwork ? 'Sepolia Testnet ✅' : `Chain ID: ${this.state.wallet.chainId} ❌`}
          <br>
          Contracts: ${contractsDeployed ? 'Ready ✅' : 'Not Deployed ❌'}
        </p>
      </div>
    `;
  }

  renderPaymentSection() {
    return `
      <div class="glass-card p-6">
        <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-green-400">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Extend Time
        </h3>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-300 mb-2">Listener Address</label>
            <input type="text" id="listener-address" placeholder="0x..." class="input-field">
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-2">Extension Minutes</label>
            <div class="flex items-center gap-3">
              <button id="decrease-minutes" class="btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
              <input type="number" id="extension-minutes" value="10" min="1" class="input-field text-center font-mono text-2xl">
              <button id="increase-minutes" class="btn-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="glass-card p-4 bg-purple-500/10">
            <div class="flex justify-between items-center">
              <span class="text-gray-300">Total Cost:</span>
              <span id="total-cost" class="text-2xl font-bold font-mono glow-text">10.0 THT</span>
            </div>
            <div class="text-sm text-gray-400 mt-1">Rate: 1.0 THT/minute</div>
          </div>

          <button id="pay-to-extend" class="btn-primary w-full shine-effect hover:scale-105 transition-transform">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="8" cy="8" r="6"/>
              <path d="M18.09 10.37A6 6 0 1 1 10.34 18"/>
              <path d="M7 6h1v4"/>
              <path d="M16.71 13.88L18.29 15.46"/>
            </svg>
            Pay to Extend
          </button>
        </div>
      </div>
    `;
  }

  renderVoiceChatSection() {
    return `
      <div class="glass-card p-6">
        <h3 class="text-2xl font-bold mb-4 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-purple-400">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          Voice Chat
        </h3>

        <div class="space-y-4">
          <div class="text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-full ${this.state.voiceChat.isConnected ? 'bg-green-500' : 'bg-gray-500'} flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </div>
            <p class="text-sm text-gray-300">
              ${this.state.voiceChat.isConnected ? 'Connected' : 'Disconnected'}
            </p>
          </div>

          ${!this.state.voiceChat.isConnected ? `
                <audio id="player" autoplay controls></audio>
            <button id="start-voice-chat" class="btn-primary w-full">
              Start Voice Chat
            </button>
          ` : `
            <div class="space-y-2">
              <button id="mute-microphone" class="btn-secondary w-full">
                Mute Microphone
              </button>
              <button id="end-voice-chat" class="btn-secondary w-full">
                End Call
              </button>
            </div>
          `}
        </div>
      </div>
    `;
  }

  renderToasts() {
    return this.state.ui.toasts.map(toast => `
      <div class="toast toast-${toast.type}" data-toast-id="${toast.id}">
        <div class="toast-content">
          <span>${toast.message}</span>
          <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
        </div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    console.log('Attaching event listeners...');
   const audio = document.getElementById("player");
     console.log("Audio element:", audio);
     if (audio) {
  const mediaSource = new MediaSource();
  audio.src = URL.createObjectURL(mediaSource);

  mediaSource.addEventListener("sourceopen", () => {
    console.log("MediaSource opened");

    const mime = 'audio/webm; codecs="opus"';
if (!MediaSource.isTypeSupported(mime)) {
  console.error("MIME type not supported:", mime);
  return;
}

    try {
    const sourceBuffer = mediaSource.addSourceBuffer('audio/webm; codecs="opus"');
    console.log("SourceBuffer created:", sourceBuffer);
    sourceBuffer.mode = "sequence";
    sourceBuffer.addEventListener("updateend", appendNextChunk);
    isBufferReady = true;
    setBufferReady(isBufferReady)
setSourceBuffer(sourceBuffer); // to listening peer

    } catch (e) {
      console.error("Failed to create SourceBuffer:", e, e.message);
      return;
    }
  });
}

    // Wallet connection
    const connectBtn = document.getElementById('connect-wallet');
    const welcomeConnectBtn = document.getElementById('welcome-connect');
    const disconnectBtn = document.getElementById('disconnect-wallet');

    if (connectBtn) connectBtn.addEventListener('click', () => this.handleConnectWallet());
    if (welcomeConnectBtn) welcomeConnectBtn.addEventListener('click', () => this.handleConnectWallet());
    if (disconnectBtn) disconnectBtn.addEventListener('click', () => this.handleDisconnect());

    // Timer controls
    const startTimerBtn = document.getElementById('start-timer');
    const pauseTimerBtn = document.getElementById('pause-timer');
    const resetTimerBtn = document.getElementById('reset-timer');

    if (startTimerBtn) startTimerBtn.addEventListener('click', () => this.handleStartTimer());
    if (pauseTimerBtn) pauseTimerBtn.addEventListener('click', () => this.handlePauseTimer());
    if (resetTimerBtn) resetTimerBtn.addEventListener('click', () => this.handleResetTimer());

    // Payment controls
    const payBtn = document.getElementById('pay-to-extend');
    const increaseBtn = document.getElementById('increase-minutes');
    const decreaseBtn = document.getElementById('decrease-minutes');
    const minutesInput = document.getElementById('extension-minutes');

    if (payBtn) payBtn.addEventListener('click', () => this.handlePayToExtend());
    if (increaseBtn) increaseBtn.addEventListener('click', () => this.adjustMinutes(10));
    if (decreaseBtn) decreaseBtn.addEventListener('click', () => this.adjustMinutes(-10));
    if (minutesInput) minutesInput.addEventListener('input', () => this.updateTotalCost());

    // Faucet
    const claimBtn = document.getElementById('claim-faucet');
    const switchNetworkBtn = document.getElementById('switch-network');

    if (claimBtn) claimBtn.addEventListener('click', () => this.handleClaimFaucet());
    if (switchNetworkBtn) switchNetworkBtn.addEventListener('click', () => this.handleSwitchNetwork());

    // Voice chat
    const startVoiceChatBtn = document.getElementById('start-voice-chat');
    const endVoiceChatBtn = document.getElementById('end-voice-chat');
    const muteBtn = document.getElementById('mute-microphone');

    if (startVoiceChatBtn) startVoiceChatBtn.addEventListener('click', () => this.handleStartVoiceChat());
    if (endVoiceChatBtn) endVoiceChatBtn.addEventListener('click', () => this.handleEndVoiceChat());
    if (muteBtn) muteBtn.addEventListener('click', () => this.handleMuteMicrophone());
  }

  // Event handlers
  async handleConnectWallet() {
    try {
      globalEventBus.emit(EVENTS.UI_LOADING_START, 'Connecting wallet...');
      
      const walletState = await this.walletManager.connect();

      if (walletState.isConnected) {
        await this.initializeContracts();
        // Don't emit WALLET_CONNECTED again - wallet.js already emitted it
      }
    } catch (error) {
      globalEventBus.emit(EVENTS.APP_ERROR, error);
      this.showToast(error.message || 'Failed to connect wallet', 'error');
    } finally {
      globalEventBus.emit(EVENTS.UI_LOADING_END);
    }
  }

  async handleDisconnect() {
    await this.walletManager.disconnect();
    this.updateState({
      wallet: {
        isConnected: false,
        address: null,
        chainId: null,
        balance: '0'
      }
    });
    this.showToast('Wallet disconnected', 'info');
  }

  handleStartTimer() {
    this.timerComponent.start();
    // Timer.start() already emits TIMER_STARTED, no need to emit again
  }

  handlePauseTimer() {
    this.timerComponent.pause();
    globalEventBus.emit(EVENTS.TIMER_PAUSED);
  }

  handleResetTimer() {
    this.timerComponent.reset();
    const newSeconds = this.timerComponent.generateRandomDuration();
    this.updateState({ 
      timer: { 
        seconds: newSeconds, 
        isRunning: false 
      } 
    });
    this.showToast(`Timer reset to ${Math.floor(newSeconds / 60)} minutes`, 'info');
  }

  async handlePayToExtend() {
    const listenerAddress = document.getElementById('listener-address')?.value;
    const extensionMinutes = parseInt(document.getElementById('extension-minutes')?.value || '10');

    if (!listenerAddress) {
      this.showToast('Please enter a listener address', 'warning');
      return;
    }

    try {
      await this.paymentComponent.executePayment(listenerAddress, extensionMinutes);
    } catch (error) {
      this.showToast(error.message, 'error');
    }
  }

  async handleClaimFaucet() {
    try {
      this.updateState({ ui: { ...this.state.ui, isLoading: true } });
      await this.contractsManager.claimFaucet();
      await this.updateBalance();
      this.showToast('Successfully claimed 100 THT!', 'success');
    } catch (error) {
      this.showToast(error.message || 'Failed to claim faucet', 'error');
    } finally {
      this.updateState({ ui: { ...this.state.ui, isLoading: false } });
    }
  }

  async handleSwitchNetwork() {
    try {
      await this.walletManager.switchToSepolia();
      this.showToast('Switched to Sepolia testnet!', 'success');
      setTimeout(() => this.handleConnectWallet(), 1000);
    } catch (error) {
      this.showToast(error.message || 'Failed to switch network', 'error');
    }
  }

  async handleStartVoiceChat() {
    try {
      await this.voiceChatManager.initializeAudio();
      
      // Test P2P connection simulation
      await this.voiceChatManager.simulateP2PConnection();
      
      this.showToast('Voice chat simulation started!', 'success');
    } catch (error) {
      this.showToast(error.message || 'Failed to start voice chat', 'error');
    }
  }

  handleEndVoiceChat() {
    this.voiceChatManager.disconnect();
  }

  handleMuteMicrophone() {
    // Toggle mute functionality
    this.showToast('Microphone muted', 'info');
  }

  adjustMinutes(delta) {
    const input = document.getElementById('extension-minutes');
    if (input) {
      const currentValue = parseInt(input.value) || 10;
      const newValue = Math.max(1, currentValue + delta);
      input.value = newValue;
      this.updateTotalCost();
    }
  }

  updateTotalCost() {
    const minutes = parseInt(document.getElementById('extension-minutes')?.value || '10');
    const cost = (minutes * 1.0).toFixed(1); // 1 THT per minute
    const costElement = document.getElementById('total-cost');
    if (costElement) {
      costElement.textContent = `${cost} THT`;
    }
  }

  async initializeContracts() {
    try {
      await this.contractsManager.initialize(this.walletManager.getSigner());
      
      // Initialize timer extensions after contracts are ready
      if (!this.timerExtensions) {
        this.timerExtensions = new TimerExtensions(this.timerComponent, this.contractsManager);
      }
      
      await this.updateBalance();
    } catch (error) {
      console.error('Failed to initialize contracts:', error);
      this.showToast('Contracts not deployed. Using demo mode.', 'warning');
    }
  }

  async updateBalance() {
    try {
      const balance = await this.contractsManager.getTokenBalance();
      this.updateState({ 
        wallet: { ...this.state.wallet, balance } 
      });
    } catch (error) {
      console.error('Failed to update balance:', error);
      // Set balance to 0 if we can't get it
      this.updateState({ 
        wallet: { ...this.state.wallet, balance: '0.0' } 
      });
    }
  }

  async handleWalletChange(newAddress) {
    this.updateState({
      wallet: { ...this.state.wallet, address: newAddress }
    });
    await this.updateBalance();
  }

  showToast(message, type = 'info') {
    const id = Date.now();
    const toast = { id, message, type };
    
    this.updateState({
      ui: {
        ...this.state.ui,
        toasts: [...this.state.ui.toasts, toast]
      }
    });

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      this.updateState({
        ui: {
          ...this.state.ui,
          toasts: this.state.ui.toasts.filter(t => t.id !== id)
        }
      }, 'TOAST_REMOVE');
    }, 5000);

    // Play sound based on type
    switch (type) {
      case 'success':
        this.soundManager.playPaymentSuccess();
        break;
      case 'error':
        this.soundManager.playError();
        break;
      case 'warning':
        this.soundManager.playTimerWarning();
        break;
    }
  }

  // Lifecycle methods
  handleAppHidden() {
    console.log('App hidden - pausing non-essential operations');
    // Pause timer if running to save battery
    if (this.state.timer.isRunning) {
      this.timerComponent.pause();
    }
  }

  handleAppVisible() {
    console.log('App visible - resuming operations');
    
    // Debounce rapid visibility changes
    if (this.visibilityTimeout) {
      clearTimeout(this.visibilityTimeout);
    }
    
    this.visibilityTimeout = setTimeout(() => {
      this.updateState({
        app: {
          ...this.state.app,
          lastActivity: Date.now()
        }
      }, 'APP_VISIBLE');
    }, 100);
  }

  handleError(error) {
    console.error('Application error:', error);
    this.showToast(`Application error: ${error.message}`, 'error');
  }

  handleStateChange(newState, oldState) {
    // Log state changes in development
    if (process.env.NODE_ENV === 'development') {
      console.log('State changed:', { newState, oldState });
    }

    // Persist important state changes
    this.storageManager.saveState({
      wallet: newState.wallet,
      timer: newState.timer,
      app: newState.app
    });
  }

  // Component lifecycle management
  async initializeComponent(component, name) {
    try {
      if (typeof component.init === 'function') {
        await component.init();
        console.log(`${name} initialized successfully`);
      }
    } catch (error) {
      console.error(`Failed to initialize ${name}:`, error);
      throw error;
    }
  }

  async destroyComponent(component, name) {
    try {
      if (typeof component.destroy === 'function') {
        await component.destroy();
        console.log(`${name} destroyed successfully`);
      }
    } catch (error) {
      console.error(`Failed to destroy ${name}:`, error);
    }
  }

  // Cleanup method
  cleanup() {
    console.log('Cleaning up application...');
    
    // Stop timer
    if (this.timerComponent) {
      this.timerComponent.pause();
    }

    // Disconnect voice chat
    if (this.voiceChatManager) {
      this.voiceChatManager.disconnect();
    }

    // Remove contract listeners
    if (this.contractsManager) {
      this.contractsManager.removeAllListeners();
    }

    // Save final state
    this.storageManager.saveState(this.state);
  }

  // State management helpers
  getState() {
    return { ...this.state };
  }

  setState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.handleStateChange(this.state, oldState);
    this.render();
  }

  // Component registration system
  registerComponent(name, component) {
    if (!this.components) {
      this.components = new Map();
    }
    this.components.set(name, component);
    console.log(`Component '${name}' registered`);
  }

  getComponent(name) {
    return this.components?.get(name);
  }
}