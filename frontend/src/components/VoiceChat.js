import SimplePeer from 'simple-peer';
import { globalEventBus, EVENTS } from '../utils/eventBus.js';
import { logger } from '../utils/logger.js';

export class VoiceChatManager {
  constructor(options = {}) {
    this.localStream = null;
    this.remoteStream = null;
    this.peer = null;
    this.isConnected = false;
    this.isMuted = false;
    this.isInitiator = false;
    this.logger = logger.child('VoiceChatManager');
    
    // Configuration
    this.config = {
      iceServers: options.iceServers || [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      audioConstraints: options.audioConstraints || {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 44100,
        channelCount: 1
      },
      reconnectAttempts: options.reconnectAttempts || 3,
      reconnectDelay: options.reconnectDelay || 2000,
      connectionTimeout: options.connectionTimeout || 30000
    };
    
    // Initialization tracking
    this.initializationAttempted = false;
    
    // State tracking
    this.state = {
      phase: 'idle', // idle, initializing, connecting, connected, disconnected, error
      connectionAttempts: 0,
      lastConnectionTime: null,
      audioLevel: 0,
      quality: 'unknown'
    };
    
    // Audio analysis
    this.audioContext = null;
    this.analyser = null;
    this.audioLevelInterval = null;
    
    // Callbacks (legacy support)
    this.callbacks = {
      onConnectionEstablished: [],
      onConnectionLost: [],
      onAudioReceived: [],
      onError: [],
      onStateChange: [],
      onAudioLevel: []
    };
    
    // Connection monitoring
    this.connectionMonitor = null;
    this.qualityMonitor = null;
    
    this.setupEventListeners();
  }

  async initializeAudio() {
    // Prevent multiple initialization attempts
    if (this.initializationAttempted) {
      this.logger.debug('Audio initialization already attempted, skipping');
      return null;
    }
    
    this.initializationAttempted = true;
    
    try {
      this.logger.info('Initializing audio...');
      this.setState('initializing');
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported in this browser');
      }
      
      // Request microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: this.config.audioConstraints,
        video: false
      });

      this.logger.info('Microphone access granted', {
        tracks: this.localStream.getAudioTracks().length,
        constraints: this.config.audioConstraints
      });
      
      // Setup audio analysis
      await this.setupAudioAnalysis();
      
      globalEventBus.emit(EVENTS.VOICE_CHAT_STARTED);
      return this.localStream;
      
    } catch (error) {
      const errorMessage = this.handleMediaError(error);
      
      // Handle permission denied gracefully without ERROR log
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        this.logger.info('Microphone permission denied - voice chat disabled');
        this.setState('disabled');
        globalEventBus.emit('voiceChat:permissionDenied', { error: errorMessage });
        return null;
      }
      
      // Only log as ERROR for actual technical errors
      this.logger.error('Audio initialization failed', error);
      this.setState('error');
      
      globalEventBus.emit('voiceChat:error', { error: errorMessage });
      this.triggerCallback('onError', new Error(errorMessage));
      throw new Error(errorMessage);
    }
  }

  async setupAudioAnalysis() {
    try {
      // Create audio context for level monitoring
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      source.connect(this.analyser);
      
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      // Start audio level monitoring
      this.startAudioLevelMonitoring();
      
      this.logger.debug('Audio analysis setup complete');
      
    } catch (error) {
      this.logger.warn('Audio analysis setup failed', error);
      // Continue without audio analysis
    }
  }

  startAudioLevelMonitoring() {
    if (!this.analyser) return;
    
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    
    this.audioLevelInterval = setInterval(() => {
      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate average audio level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      const normalizedLevel = average / 255;
      
      this.state.audioLevel = normalizedLevel;
      this.triggerCallback('onAudioLevel', normalizedLevel);
      
    }, 100); // Update every 100ms
  }

  stopAudioLevelMonitoring() {
    if (this.audioLevelInterval) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
  }

  async createPeerConnection(isInitiator = false) {
    try {
      this.logger.info('Creating peer connection', { isInitiator });
      this.setState('connecting');
      this.isInitiator = isInitiator;
      
      // Ensure we have local stream
      if (!this.localStream && !this.initializationAttempted) {
        await this.initializeAudio();
      } else if (this.initializationAttempted && !this.localStream) {
        this.logger.info('Audio initialization was attempted but failed, skipping P2P connection');
        throw new Error('Audio not available - microphone permission denied');
      }
      
      // Create SimplePeer instance
      this.peer = new SimplePeer({
        initiator: isInitiator,
        stream: this.localStream,
        config: {
          iceServers: this.config.iceServers
        },
        channelConfig: {
          ordered: true
        }
      });
      
      this.setupPeerEventListeners();
      
      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (!this.isConnected) {
          this.logger.warn('Connection timeout');
          this.handleConnectionError(new Error('Connection timeout'));
        }
      }, this.config.connectionTimeout);
      
      return this.peer;
      
    } catch (error) {
      this.logger.error('Failed to create peer connection', error);
      this.setState('error');
      throw error;
    }
  }

  setupPeerEventListeners() {
    if (!this.peer) return;
    
    // Handle signaling data
    this.peer.on('signal', (data) => {
      this.logger.debug('Signaling data generated', { type: data.type });
      globalEventBus.emit('voiceChat:signal', {
        signal: data,
        isInitiator: this.isInitiator
      });
    });
    
    // Handle connection establishment
    this.peer.on('connect', () => {
      this.logger.info('Peer connection established');
      this.handleConnectionEstablished();
    });
    
    // Handle incoming stream
    this.peer.on('stream', (stream) => {
      this.logger.info('Remote stream received');
      this.handleRemoteStream(stream);
    });
    
    // Handle data channel messages
    this.peer.on('data', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleDataChannelMessage(message);
      } catch (error) {
        this.logger.warn('Invalid data channel message', error);
      }
    });
    
    // Handle errors
    this.peer.on('error', (error) => {
      this.logger.error('Peer connection error', error);
      this.handleConnectionError(error);
    });
    
    // Handle connection close
    this.peer.on('close', () => {
      this.logger.info('Peer connection closed');
      this.handleConnectionLost();
    });
  }

  async handleSignal(signalData) {
    try {
      if (!this.peer) {
        this.logger.warn('Received signal but no peer connection exists');
        return;
      }
      
      this.logger.debug('Processing signal data', { type: signalData.type });
      this.peer.signal(signalData);
      
    } catch (error) {
      this.logger.error('Error handling signal', error);
      this.handleConnectionError(error);
    }
  }

  handleConnectionEstablished() {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    this.isConnected = true;
    this.state.connectionAttempts = 0;
    this.state.lastConnectionTime = Date.now();
    this.setState('connected');
    
    // Start connection monitoring
    this.startConnectionMonitoring();
    
    globalEventBus.emit(EVENTS.VOICE_CHAT_CONNECTED);
    this.triggerCallback('onConnectionEstablished');
    
    this.logger.info('Voice chat connection established successfully');
  }

  handleRemoteStream(stream) {
    this.remoteStream = stream;
    
    // Setup remote audio element if needed
    this.setupRemoteAudio(stream);
    
    this.triggerCallback('onAudioReceived', stream);
    globalEventBus.emit('voiceChat:remoteStreamReceived', { stream });
  }

  setupRemoteAudio(stream) {
    // Create or update remote audio element
    let audioElement = document.getElementById('remote-audio');
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.id = 'remote-audio';
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      document.body.appendChild(audioElement);
    }
    
    audioElement.srcObject = stream;
    
    this.logger.debug('Remote audio element setup complete');
  }

  handleDataChannelMessage(message) {
    switch (message.type) {
      case 'audioLevel':
        // Handle remote audio level updates
        globalEventBus.emit('voiceChat:remoteAudioLevel', message.level);
        break;
        
      case 'mute':
        // Handle remote mute status
        globalEventBus.emit('voiceChat:remoteMuteChanged', message.muted);
        break;
        
      case 'quality':
        // Handle quality reports
        this.state.quality = message.quality;
        break;
        
      default:
        this.logger.debug('Unknown data channel message', message);
    }
  }

  async handleAnswer(answer) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(answer);
      }
    } catch (error) {
      this.triggerCallback('onError', error);
      throw error;
    }
  }

  async handleIceCandidate(candidate) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.addIceCandidate(candidate);
      }
    } catch (error) {
      this.triggerCallback('onError', error);
      throw error;
    }
  }

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted = !audioTrack.enabled;
        return this.isMuted;
      }
    }
    return false;
  }

  disconnect() {
    try {
      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
        this.localStream = null;
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }

      this.isConnected = false;
      this.isMuted = false;
      
      console.log('Voice chat disconnected');
    } catch (error) {
      console.error('Error disconnecting voice chat:', error);
    }
  }

  handleMediaError(error) {
    switch (error.name) {
      case 'NotAllowedError':
        return 'Microphone access denied. Please allow microphone access and try again.';
      case 'NotFoundError':
        return 'No microphone found. Please connect a microphone and try again.';
      case 'NotReadableError':
        return 'Microphone is already in use by another application.';
      case 'OverconstrainedError':
        return 'Microphone does not support the required constraints.';
      case 'SecurityError':
        return 'Microphone access blocked due to security restrictions.';
      default:
        return `Microphone error: ${error.message}`;
    }
  }

  // Event callback methods
  onConnectionEstablished(callback) {
    this.callbacks.onConnectionEstablished.push(callback);
  }

  onConnectionLost(callback) {
    this.callbacks.onConnectionLost.push(callback);
  }

  onAudioReceived(callback) {
    this.callbacks.onAudioReceived.push(callback);
  }

  onError(callback) {
    this.callbacks.onError.push(callback);
  }

  triggerCallback(eventName, ...args) {
    this.callbacks[eventName].forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`VoiceChat callback error (${eventName}):`, error);
      }
    });
  }

  // Utility methods
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      isMuted: this.isMuted,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream
    };
  }

  handleConnectionError(error) {
    this.logger.error('Connection error occurred', error);
    
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    this.setState('error');
    this.stopConnectionMonitoring();
    
    // Attempt reconnection if not at max attempts
    if (this.state.connectionAttempts < this.config.reconnectAttempts) {
      this.scheduleReconnection();
    } else {
      this.logger.error('Max reconnection attempts reached');
      globalEventBus.emit('voiceChat:maxReconnectAttemptsReached');
    }
    
    this.triggerCallback('onError', error);
    globalEventBus.emit('voiceChat:error', { error: error.message });
  }

  handleConnectionLost() {
    this.logger.warn('Voice chat connection lost');
    
    this.isConnected = false;
    this.setState('disconnected');
    this.stopConnectionMonitoring();
    
    // Clean up remote audio
    const audioElement = document.getElementById('remote-audio');
    if (audioElement) {
      audioElement.srcObject = null;
    }
    
    this.triggerCallback('onConnectionLost');
    globalEventBus.emit(EVENTS.VOICE_CHAT_DISCONNECTED);
    
    // Attempt reconnection
    this.scheduleReconnection();
  }

  scheduleReconnection() {
    if (this.state.connectionAttempts >= this.config.reconnectAttempts) {
      return;
    }
    
    this.state.connectionAttempts++;
    const delay = this.config.reconnectDelay * this.state.connectionAttempts;
    
    this.logger.info('Scheduling reconnection', { 
      attempt: this.state.connectionAttempts,
      delay 
    });
    
    setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  async reconnect() {
    try {
      this.logger.info('Attempting to reconnect...');
      
      // Clean up existing connection
      this.cleanup(false);
      
      // Create new connection
      await this.createPeerConnection(this.isInitiator);
      
    } catch (error) {
      this.logger.error('Reconnection failed', error);
      this.handleConnectionError(error);
    }
  }

  // Connection monitoring
  startConnectionMonitoring() {
    this.connectionMonitor = setInterval(() => {
      this.checkConnectionQuality();
    }, 5000); // Check every 5 seconds
    
    this.qualityMonitor = setInterval(() => {
      this.sendQualityReport();
    }, 10000); // Send quality report every 10 seconds
  }

  stopConnectionMonitoring() {
    if (this.connectionMonitor) {
      clearInterval(this.connectionMonitor);
      this.connectionMonitor = null;
    }
    
    if (this.qualityMonitor) {
      clearInterval(this.qualityMonitor);
      this.qualityMonitor = null;
    }
  }

  checkConnectionQuality() {
    if (!this.peer || !this.isConnected) return;
    
    // In a real implementation, you would check WebRTC stats
    // For now, we'll simulate quality based on connection time
    const connectionTime = Date.now() - this.state.lastConnectionTime;
    
    if (connectionTime > 60000) { // 1 minute
      this.state.quality = 'good';
    } else if (connectionTime > 30000) { // 30 seconds
      this.state.quality = 'fair';
    } else {
      this.state.quality = 'poor';
    }
  }

  sendQualityReport() {
    if (!this.peer || !this.isConnected) return;
    
    try {
      this.peer.send(JSON.stringify({
        type: 'quality',
        quality: this.state.quality,
        audioLevel: this.state.audioLevel,
        timestamp: Date.now()
      }));
    } catch (error) {
      this.logger.debug('Failed to send quality report', error);
    }
  }

  // Enhanced mute functionality
  toggleMute() {
    if (!this.localStream) {
      this.logger.warn('No local stream to mute');
      return false;
    }
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) {
      this.logger.warn('No audio track found');
      return false;
    }
    
    audioTrack.enabled = !audioTrack.enabled;
    this.isMuted = !audioTrack.enabled;
    
    this.logger.info('Mute toggled', { muted: this.isMuted });
    
    // Notify remote peer
    if (this.peer && this.isConnected) {
      try {
        this.peer.send(JSON.stringify({
          type: 'mute',
          muted: this.isMuted,
          timestamp: Date.now()
        }));
      } catch (error) {
        this.logger.debug('Failed to send mute status', error);
      }
    }
    
    globalEventBus.emit(this.isMuted ? EVENTS.VOICE_CHAT_MUTED : EVENTS.VOICE_CHAT_UNMUTED);
    return this.isMuted;
  }

  setMute(muted) {
    if (this.isMuted === muted) return muted;
    return this.toggleMute();
  }

  // State management
  setState(phase) {
    const prevPhase = this.state.phase;
    this.state.phase = phase;
    
    if (prevPhase !== phase) {
      this.logger.debug('Voice chat phase changed', { from: prevPhase, to: phase });
      this.triggerCallback('onStateChange', this.getState());
      globalEventBus.emit('voiceChat:stateChanged', this.getState());
    }
  }

  getState() {
    return {
      isConnected: this.isConnected,
      isMuted: this.isMuted,
      phase: this.state.phase,
      hasLocalStream: !!this.localStream,
      hasRemoteStream: !!this.remoteStream,
      audioLevel: this.state.audioLevel,
      quality: this.state.quality,
      connectionAttempts: this.state.connectionAttempts,
      lastConnectionTime: this.state.lastConnectionTime,
      isInitiator: this.isInitiator
    };
  }

  // Event listeners setup
  setupEventListeners() {
    // Listen for signaling events from other components
    globalEventBus.on('voiceChat:signal', (data) => {
      if (data.isInitiator !== this.isInitiator) {
        this.handleSignal(data.signal);
      }
    });
    
    // Listen for connection requests
    globalEventBus.on('voiceChat:connect', (data) => {
      this.createPeerConnection(data.isInitiator || false);
    });
    
    // Listen for disconnect requests
    globalEventBus.on('voiceChat:disconnect', () => {
      this.disconnect();
    });
  }

  // Enhanced disconnect
  disconnect() {
    this.logger.info('Disconnecting voice chat');
    
    this.cleanup(true);
    
    globalEventBus.emit(EVENTS.VOICE_CHAT_ENDED);
    this.logger.info('Voice chat disconnected');
  }

  cleanup(fullCleanup = true) {
    // Stop monitoring
    this.stopConnectionMonitoring();
    this.stopAudioLevelMonitoring();
    
    // Clear timeouts
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Close peer connection
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    
    // Stop local stream
    if (this.localStream && fullCleanup) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
      });
      this.localStream = null;
    }
    
    // Clean up audio context
    if (this.audioContext && fullCleanup) {
      this.audioContext.close();
      this.audioContext = null;
      this.analyser = null;
    }
    
    // Remove remote audio element
    const audioElement = document.getElementById('remote-audio');
    if (audioElement && fullCleanup) {
      audioElement.remove();
    }
    
    // Reset state
    this.isConnected = false;
    this.isMuted = false;
    this.remoteStream = null;
    
    if (fullCleanup) {
      this.state = {
        phase: 'idle',
        connectionAttempts: 0,
        lastConnectionTime: null,
        audioLevel: 0,
        quality: 'unknown'
      };
    }
  }

  // Utility methods
  getAudioDevices() {
    return navigator.mediaDevices.enumerateDevices()
      .then(devices => devices.filter(device => device.kind === 'audioinput'));
  }

  async switchAudioDevice(deviceId) {
    try {
      // Stop current stream
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Get new stream with specified device
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          ...this.config.audioConstraints,
          deviceId: { exact: deviceId }
        },
        video: false
      });
      
      // Update peer connection if active
      if (this.peer && this.isConnected) {
        // Replace track in peer connection
        const audioTrack = this.localStream.getAudioTracks()[0];
        this.peer.replaceTrack(this.peer.streams[0].getAudioTracks()[0], audioTrack, this.localStream);
      }
      
      this.logger.info('Audio device switched', { deviceId });
      return true;
      
    } catch (error) {
      this.logger.error('Failed to switch audio device', error);
      throw error;
    }
  }

  // Statistics and debugging
  getConnectionStats() {
    return {
      state: this.getState(),
      config: this.config,
      performance: {
        connectionAttempts: this.state.connectionAttempts,
        lastConnectionTime: this.state.lastConnectionTime,
        uptime: this.state.lastConnectionTime ? Date.now() - this.state.lastConnectionTime : 0
      }
    };
  }

  // Simple peer-to-peer signaling simulation for testing
  async simulateP2PConnection() {
    try {
      this.logger.info('Simulating P2P connection for testing');
      
      // Only try to initialize audio if not already attempted
      if (!this.initializationAttempted) {
        await this.initializeAudio();
      } else if (!this.localStream) {
        this.logger.info('Audio not available for P2P connection - microphone permission denied');
        // Continue with simulation even without audio
      }
      
      // Simulate successful connection after a delay
      setTimeout(() => {
        this.handleConnectionEstablished();
      }, 2000);
      
      return true;
    } catch (error) {
      this.triggerCallback('onError', error);
      throw error;
    }
  }
}