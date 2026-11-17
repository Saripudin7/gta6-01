// Solmar Bay — all sound is synthesized with WebAudio. No audio files, no
// network: oscillators and filtered noise make the engine hum, the siren wail,
// the gunshots crack and the mission chime ring.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.sirenPhase = 0;
    this._noiseBuffer = null;
  }

  // Must be called from a user gesture (click / key) the first time.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.ctx.destination);
    // A one-second white-noise buffer reused by every noise-based sound.
    const length = this.ctx.sampleRate;
    this._noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this._noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    this._startEngineLoop();
    this._startSirenLoop();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  // A low sawtooth whose pitch follows the car's speed, through a low-pass.
  _startEngineLoop() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 420;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  // A two-tone siren that alternates by itself; gain stays 0 until wanted.
  _startSirenLoop() {
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 750;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
  }

  // Called every frame: engine pitch from speed, siren wail when wanted.
  update(speed01, wanted, dt) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.engineOsc) {
      this.engineOsc.frequency.setTargetAtTime(52 + speed01 * 165, t, 0.08);
      this.engineGain.gain.setTargetAtTime(speed01 > 0.02 ? 0.05 + speed01 * 0.06 : 0.0, t, 0.1);
    }
    if (this.sirenOsc) {
      this.sirenPhase += dt * 1.6;
      const high = Math.sin(this.sirenPhase * Math.PI) > 0;
      this.sirenOsc.frequency.setTargetAtTime(high ? 950 : 700, t, 0.05);
      this.sirenGain.gain.setTargetAtTime(wanted > 0 ? 0.045 : 0, t, 0.2);
    }
  }

  _noiseBurst(duration, filterFreq, gainValue, type) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type || 'bandpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + duration);
  }

  _tone(freq, duration, gainValue, type, slideTo) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + duration);
  }

  // Pistol crack: short noise burst plus a low thump.
  shot() {
    this._noiseBurst(0.14, 1800, 0.5, 'highpass');
    this._tone(140, 0.1, 0.25, 'square', 60);
  }

  // A thud when a bullet or a car hits something solid.
  thud() {
    this._noiseBurst(0.12, 300, 0.35, 'lowpass');
    this._tone(90, 0.12, 0.2, 'sine', 45);
  }

  // Coin / pickup blip.
  pickup() {
    this._tone(880, 0.09, 0.22, 'sine');
    setTimeout(() => this._tone(1320, 0.12, 0.2, 'sine'), 70);
  }

  // Mission-complete chime: a little rising arpeggio.
  chime() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this._tone(freq, 0.22, 0.22, 'triangle'), i * 90);
    });
  }

  // Sad two-note sting for failing a mission or getting busted.
  fail() {
    this._tone(330, 0.25, 0.22, 'triangle', 220);
    setTimeout(() => this._tone(220, 0.4, 0.22, 'triangle', 147), 180);
  }

  // Car door / steal click.
  click() {
    this._tone(1200, 0.05, 0.15, 'square');
  }

  // Skid squeal when the handbrake is pulled at speed.
  skid() {
    this._noiseBurst(0.3, 2400, 0.12, 'bandpass');
  }

  // Cash-register ka-ching when money lands.
  cash() {
    this._tone(1568, 0.08, 0.18, 'sine');
    setTimeout(() => this._tone(2093, 0.18, 0.18, 'sine'), 80);
  }
}
