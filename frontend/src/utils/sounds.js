export class SoundManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.5;
    this.sounds = {};
    this.audioContext = null;
  }

  init() {
    try {
      // Initialize Web Audio API for better sound control
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create sound effects using oscillators
      this.createSounds();
      
      console.log('Sound manager initialized');
    } catch (error) {
      console.warn('Web Audio API not supported, falling back to basic audio');
      this.audioContext = null;
    }
  }

  createSounds() {
    // Define sound configurations
    this.soundConfigs = {
      paymentSuccess: {
        type: 'success',
        frequency: 800,
        duration: 0.3,
        volume: 0.6
      },
      paymentReceived: {
        type: 'notification',
        frequency: 600,
        duration: 0.5,
        volume: 0.7
      },
      timerWarning: {
        type: 'warning',
        frequency: 400,
        duration: 0.2,
        volume: 0.5,
        repeat: 3
      },
      timerEnd: {
        type: 'alert',
        frequency: 300,
        duration: 1.0,
        volume: 0.8
      },
      error: {
        type: 'error',
        frequency: 200,
        duration: 0.4,
        volume: 0.6
      },
      buttonClick: {
        type: 'click',
        frequency: 1000,
        duration: 0.1,
        volume: 0.3
      }
    };
  }

  playSound(soundName) {
    if (!this.enabled) return;

    const config = this.soundConfigs[soundName];
    if (!config) {
      console.warn(`Sound '${soundName}' not found`);
      return;
    }

    if (this.audioContext) {
      this.playWebAudioSound(config);
    } else {
      this.playFallbackSound(config);
    }
  }

  playWebAudioSound(config) {
    try {
      // Resume AudioContext if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(console.warn);
        return; // Skip this play attempt
      }
      
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Set frequency
      oscillator.frequency.setValueAtTime(config.frequency, this.audioContext.currentTime);

      // Set volume envelope
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(config.volume * this.volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + config.duration);

      // Set waveform based on sound type
      switch (config.type) {
        case 'success':
        case 'notification':
          oscillator.type = 'sine';
          break;
        case 'warning':
        case 'alert':
          oscillator.type = 'square';
          break;
        case 'error':
          oscillator.type = 'sawtooth';
          break;
        case 'click':
          oscillator.type = 'triangle';
          break;
        default:
          oscillator.type = 'sine';
      }

      oscillator.start(now);
      oscillator.stop(now + config.duration);

      // Handle repeated sounds
      if (config.repeat && config.repeat > 1) {
        for (let i = 1; i < config.repeat; i++) {
          setTimeout(() => {
            this.playWebAudioSound(config);
          }, i * (config.duration * 1000 + 100));
        }
      }
    } catch (error) {
      console.error('Error playing web audio sound:', error);
    }
  }

  playFallbackSound(config) {
    // Fallback to simple beep using data URI
    try {
      const audio = new Audio();
      
      // Generate simple tone data URI
      const sampleRate = 44100;
      const duration = config.duration;
      const samples = sampleRate * duration;
      const buffer = new ArrayBuffer(samples * 2);
      const view = new DataView(buffer);

      for (let i = 0; i < samples; i++) {
        const sample = Math.sin(2 * Math.PI * config.frequency * i / sampleRate) * 0x7FFF * config.volume * this.volume;
        view.setInt16(i * 2, sample, true);
      }

      // Create WAV file data URI (simplified)
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      
      audio.src = url;
      audio.volume = config.volume * this.volume;
      audio.play().catch(error => {
        console.warn('Could not play fallback sound:', error);
      });

      // Clean up
      audio.addEventListener('ended', () => {
        URL.revokeObjectURL(url);
      });
    } catch (error) {
      console.warn('Fallback sound failed:', error);
    }
  }

  // Specific sound methods
  playPaymentSuccess() {
    this.playSound('paymentSuccess');
  }

  playPaymentReceived() {
    this.playSound('paymentReceived');
  }

  playTimerWarning() {
    this.playSound('timerWarning');
  }

  playTimerEnd() {
    this.playSound('timerEnd');
  }

  playError() {
    this.playSound('error');
  }

  playButtonClick() {
    this.playSound('buttonClick');
  }

  // Control methods
  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume() {
    return this.volume;
  }

  // Test all sounds
  testSounds() {
    const sounds = Object.keys(this.soundConfigs);
    sounds.forEach((sound, index) => {
      setTimeout(() => {
        console.log(`Testing sound: ${sound}`);
        this.playSound(sound);
      }, index * 1000);
    });
  }

  // Resume audio context (required for some browsers)
  resumeAudioContext() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      return this.audioContext.resume();
    }
    return Promise.resolve();
  }
}