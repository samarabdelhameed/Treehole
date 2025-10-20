/**
 * WebRTC and Simple-Peer Polyfills
 * Ensures compatibility across different browsers and environments
 */

// Global polyfill for Node.js globals in browser
if (typeof global === 'undefined') {
  window.global = window;
}

// Buffer polyfill for simple-peer
if (typeof window.Buffer === 'undefined') {
  window.Buffer = {
    isBuffer: () => false,
    from: (data) => new Uint8Array(data),
    alloc: (size) => new Uint8Array(size)
  };
}

// Process polyfill
if (typeof window.process === 'undefined') {
  window.process = {
    env: { NODE_ENV: 'production' },
    nextTick: (fn) => setTimeout(fn, 0),
    version: '',
    versions: { node: '16.0.0' }
  };
}

// WebRTC adapter for cross-browser compatibility
export const initWebRTCPolyfills = () => {
  // Check for WebRTC support
  if (!window.RTCPeerConnection) {
    console.warn('WebRTC not supported in this browser');
    return false;
  }

  // Normalize getUserMedia
  if (!navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }

  if (!navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia = (constraints) => {
      const getUserMedia = navigator.webkitGetUserMedia || 
                          navigator.mozGetUserMedia || 
                          navigator.msGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(new Error('getUserMedia is not implemented'));
      }

      return new Promise((resolve, reject) => {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  return true;
};

// Simple-peer configuration for better compatibility
export const getSimplePeerConfig = () => {
  return {
    initiator: false,
    trickle: true,
    config: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    }
  };
};

// Error handler for WebRTC issues
export const handleWebRTCError = (error) => {
  const errorMessages = {
    'NotAllowedError': 'Microphone access denied. Please allow microphone access.',
    'NotFoundError': 'No microphone found. Please connect a microphone.',
    'NotReadableError': 'Microphone is already in use by another application.',
    'OverconstrainedError': 'Microphone constraints not supported.',
    'SecurityError': 'Microphone access blocked due to security restrictions.',
    'AbortError': 'Microphone access was aborted.',
    'TypeError': 'Invalid microphone constraints.'
  };

  const friendlyMessage = errorMessages[error.name] || `WebRTC error: ${error.message}`;
  
  console.error('WebRTC Error:', {
    name: error.name,
    message: error.message,
    friendlyMessage
  });

  return friendlyMessage;
};

// Initialize polyfills immediately
initWebRTCPolyfills();