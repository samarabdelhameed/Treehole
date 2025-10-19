// Sound effects for better UX
export class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private enabled = true;

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private constructor() {
    // Initialize audio context on user interaction
    document.addEventListener('click', this.initAudio.bind(this), { once: true });
  }

  private initAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio not supported:', error);
      this.enabled = false;
    }
  }

  private createTone(frequency: number, duration: number, type: OscillatorType = 'sine') {
    if (!this.audioContext || !this.enabled) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration);
  }

  // Payment success sound
  playPaymentSuccess() {
    this.createTone(523.25, 0.2); // C5
    setTimeout(() => this.createTone(659.25, 0.2), 100); // E5
    setTimeout(() => this.createTone(783.99, 0.3), 200); // G5
  }

  // Timer warning sound (last 60 seconds)
  playTimerWarning() {
    this.createTone(440, 0.1, 'triangle'); // A4
    setTimeout(() => this.createTone(440, 0.1, 'triangle'), 150);
  }

  // Timer end sound
  playTimerEnd() {
    this.createTone(220, 0.5, 'sawtooth'); // A3
    setTimeout(() => this.createTone(196, 0.5, 'sawtooth'), 250); // G3
  }

  // Connection sound
  playConnection() {
    this.createTone(880, 0.15); // A5
    setTimeout(() => this.createTone(1108.73, 0.15), 75); // C#6
  }

  // Error sound
  playError() {
    this.createTone(200, 0.3, 'sawtooth');
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  isEnabled() {
    return this.enabled;
  }
}

export const soundManager = SoundManager.getInstance();