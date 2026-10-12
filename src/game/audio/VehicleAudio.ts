/**
 * Web Audio API procedural sports car sound synthesizer.
 * Generates realistic engine rumble, RPM acceleration, exhaust backfire pops,
 * tire squeal friction noise, and impact thuds without external audio files.
 */
export class VehicleAudio {
  private ctx: AudioContext | null = null;
  private isInitialized = false;
  private isMuted = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private masterVolume = 0.7;
  private engineVolume = 0.7;
  private sfxVolume = 0.8;

  // Engine audio nodes
  private engineGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private subOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private distortion: WaveShaperNode | null = null;

  // Tire skid audio nodes
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private skidNoiseNode: AudioBufferSourceNode | null = null;

  // Rain ambience nodes
  private rainGain: GainNode | null = null;
  private rainNoiseNode: AudioBufferSourceNode | null = null;

  private currentRpm = 800;
  private lastGear = 1;

  constructor() {
    // Lazy initialized on first user interaction to comply with browser autoplay policy
  }

  public init() {
    if (this.isInitialized && this.ctx) {
      if (this.ctx.state === 'suspended' && !this.isMuted) {
        this.ctx.resume().catch(() => {});
      }
      return;
    }

    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.setupEngineSound();
      this.setupTireSkidSound();
      this.setupRainSound();

      this.isInitialized = true;
    } catch {
      // Audio not supported or blocked
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const time = this.ctx.currentTime;
      const targetGain = muted ? 0 : this.masterVolume;
      this.masterGain.gain.cancelScheduledValues(time);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, time);
      this.masterGain.gain.linearRampToValueAtTime(targetGain, time + 0.03);

      if (muted) {
        if (this.engineGain) this.engineGain.gain.setValueAtTime(0, time + 0.04);
        if (this.skidGain) this.skidGain.gain.setValueAtTime(0, time + 0.04);
        if (this.rainGain) this.rainGain.gain.setValueAtTime(0, time + 0.04);
      } else {
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {});
        }
      }
    }
  }

  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      const time = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(time);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, time);
      this.masterGain.gain.linearRampToValueAtTime(this.masterVolume, time + 0.03);
    }
  }

  public setEngineVolume(vol: number) {
    this.engineVolume = Math.max(0, Math.min(1, vol));
  }

  public setSfxVolume(vol: number) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setTargetAtTime(this.sfxVolume, this.ctx.currentTime, 0.03);
    }
  }

  private setupEngineSound() {
    if (!this.ctx || !this.masterGain) return;

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.2;

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 400;
    this.engineFilter.Q.value = 2.5;

    // Distortion wave shaper for throaty sports car exhaust growl
    this.distortion = this.ctx.createWaveShaper();
    this.distortion.curve = this.makeDistortionCurve(20) as Float32Array<ArrayBuffer>;
    this.distortion.oversample = '2x';

    // 3 Oscillators: Primary cylinder pulses, harmonic overtone, and low-end displacement rumble
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sawtooth';
    this.osc1.frequency.value = 35; // Idle ~ 800 RPM

    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'triangle';
    this.osc2.frequency.value = 70;

    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = 'sine';
    this.subOsc.frequency.value = 25;

    const oscMix = this.ctx.createGain();
    oscMix.gain.value = 0.5;

    this.osc1.connect(oscMix);
    this.osc2.connect(oscMix);
    this.subOsc.connect(oscMix);

    oscMix.connect(this.distortion);
    this.distortion.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
    this.subOsc.start();
  }

  private setupTireSkidSound() {
    if (!this.ctx || !this.masterGain) return;

    // Create 2-second looped noise buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02; // Pink-ish noise
      lastOut = output[i];
    }

    this.skidNoiseNode = this.ctx.createBufferSource();
    this.skidNoiseNode.buffer = noiseBuffer;
    this.skidNoiseNode.loop = true;

    this.skidFilter = this.ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1100;
    this.skidFilter.Q.value = 4.0;

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.value = 0;

    this.skidNoiseNode.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.masterGain);

    this.skidNoiseNode.start();
  }

  private makeDistortionCurve(amount: number): Float32Array {
    const k = typeof amount === 'number' ? amount : 50;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  public update(rpm: number, throttle: number, slip: number, gear: number | string) {
    if (!this.isInitialized || !this.ctx) return;

    if (this.isMuted) {
      if (this.engineGain) this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      if (this.skidGain) this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.currentRpm = rpm;
    const time = this.ctx.currentTime;

    // Gear shift exhaust pop trigger
    const numericGear = typeof gear === 'number' ? gear : 1;
    if (numericGear !== this.lastGear) {
      this.triggerShiftPop();
      this.lastGear = numericGear;
    }

    // Map RPM (800 - 8000) to engine frequencies
    const baseFreq = 28 + (rpm / 8000) * 140;
    if (this.osc1 && this.osc2 && this.subOsc && this.engineFilter && this.engineGain) {
      this.osc1.frequency.setTargetAtTime(baseFreq, time, 0.05);
      this.osc2.frequency.setTargetAtTime(baseFreq * 2.05, time, 0.05);
      this.subOsc.frequency.setTargetAtTime(baseFreq * 0.5, time, 0.05);

      // Lowpass cutoff opens with throttle and RPM for aggressive scream
      const cutoff = 300 + (rpm / 8000) * 2200 + throttle * 800;
      this.engineFilter.frequency.setTargetAtTime(cutoff, time, 0.05);

      // Engine volume dynamics
      const gainVal = (0.15 + throttle * 0.25 + (rpm / 8000) * 0.25) * this.engineVolume;
      this.engineGain.gain.setTargetAtTime(gainVal, time, 0.05);
    }

    // Tire skid screeches when slip > 0.35
    if (this.skidGain && this.skidFilter) {
      if (slip > 0.35) {
        const skidIntensity = Math.min(1.0, (slip - 0.35) * 2.2);
        this.skidGain.gain.setTargetAtTime(skidIntensity * 0.45 * this.sfxVolume, time, 0.04);
        this.skidFilter.frequency.setTargetAtTime(900 + skidIntensity * 800, time, 0.04);
      } else {
        this.skidGain.gain.setTargetAtTime(0, time, 0.08);
      }
    }
  }

  public triggerTurboFlutter() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const time = this.ctx.currentTime;
      // Twin turbo flutter sequence (3 mini burst chirps)
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800 - i * 120, time + i * 0.06);
        osc.frequency.exponentialRampToValueAtTime(300, time + i * 0.06 + 0.05);

        filter.type = 'bandpass';
        filter.frequency.value = 1400;
        filter.Q.value = 3.0;

        gain.gain.setValueAtTime(0.18, time + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.06 + 0.06);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(time + i * 0.06);
        osc.stop(time + i * 0.06 + 0.07);
      }
    } catch {
      // Ignore
    }
  }

  public triggerSpeedCameraFlash() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2800, time);
      osc.frequency.exponentialRampToValueAtTime(1400, time + 0.08);

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.12);
    } catch {
      // Ignore
    }
  }

  public triggerHardLanding() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(65, time);
      osc.frequency.exponentialRampToValueAtTime(25, time + 0.18);

      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.25);
    } catch {
      // Ignore
    }
  }

  public triggerShiftPop() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const popOsc = this.ctx.createOscillator();
      const popGain = this.ctx.createGain();
      const popFilter = this.ctx.createBiquadFilter();

      popOsc.type = 'triangle';
      popOsc.frequency.setValueAtTime(140, this.ctx.currentTime);
      popOsc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.12);

      popFilter.type = 'lowpass';
      popFilter.frequency.value = 600;

      popGain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      popGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      popOsc.connect(popFilter);
      popFilter.connect(popGain);
      popGain.connect(this.masterGain);

      popOsc.start();
      popOsc.stop(this.ctx.currentTime + 0.15);
    } catch {
      // Ignore audio glitch
    }
  }

  public triggerCollision() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(90, time);
      osc.frequency.exponentialRampToValueAtTime(20, time + 0.25);

      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start();
      osc.stop(time + 0.3);
    } catch {
      // Ignore audio glitch
    }
  }

  public triggerLightClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 2200;
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch {
      // Ignore
    }
  }

  private setupRainSound() {
    if (!this.ctx || !this.masterGain) return;

    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // White noise
    }

    this.rainNoiseNode = this.ctx.createBufferSource();
    this.rainNoiseNode.buffer = noiseBuffer;
    this.rainNoiseNode.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1400;
    rainFilter.Q.value = 1.2;

    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;

    this.rainNoiseNode.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.masterGain);

    this.rainNoiseNode.start();
  }

  public setRain(active: boolean) {
    if (!this.rainGain || !this.ctx || this.isMuted) return;
    this.rainGain.gain.setTargetAtTime(active ? 0.18 : 0, this.ctx.currentTime, 0.2);
  }

  public triggerCheckpointDing() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const time = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, time); // D5
      osc1.frequency.setValueAtTime(880, time + 0.08); // A5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, time + 0.08); // D6

      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.masterGain);

      osc1.start(time);
      osc2.start(time + 0.08);
      osc1.stop(time + 0.4);
      osc2.stop(time + 0.4);
    } catch {
      // Ignore
    }
  }

  public triggerMissionSuccess() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const time = this.ctx.currentTime;
      const chordNotes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      chordNotes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time + idx * 0.09);

        gain.gain.setValueAtTime(0.22, time + idx * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.8 + idx * 0.09);

        osc.connect(gain);
        gain.connect(this.masterGain!);

        osc.start(time + idx * 0.09);
        osc.stop(time + 0.9 + idx * 0.09);
      });
    } catch {
      // Ignore
    }
  }

  public triggerMissionFail() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.linearRampToValueAtTime(110, time + 0.4);

      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.5);
    } catch {
      // Ignore
    }
  }

  public triggerIndicatorRelay(tick: boolean) {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(tick ? 1200 : 900, time);

      gain.gain.setValueAtTime(0.08, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.04);
    } catch {
      // Ignore
    }
  }

  public triggerUiClick() {
    if (!this.ctx || !this.masterGain || this.isMuted) return;
    try {
      const time = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, time);
      osc.frequency.exponentialRampToValueAtTime(400, time + 0.05);

      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.06);
    } catch {
      // Ignore
    }
  }
}
