// Synthesized sound with WebAudio — no audio files, everything is generated:
// engine hum, siren, gunshot, pickup chime, mission jingle, crash thud.
export function createAudio() {
  const audio = {
    ctx: null,
    muted: false,
    engineOsc: null,
    engineGain: null,
    sirenTimer: 0,
  };

  audio.ensure = function ensure() {
    if (audio.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audio.ctx = new AC();
      audio.master = audio.ctx.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.ctx.destination);
      // Engine: a low sawtooth whose pitch follows speed, started on demand.
      audio.engineOsc = audio.ctx.createOscillator();
      audio.engineOsc.type = 'sawtooth';
      audio.engineOsc.frequency.value = 55;
      audio.engineGain = audio.ctx.createGain();
      audio.engineGain.gain.value = 0;
      const filter = audio.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      audio.engineOsc.connect(filter);
      filter.connect(audio.engineGain);
      audio.engineGain.connect(audio.master);
      audio.engineOsc.start();
    } catch {
      audio.ctx = null;
    }
  };

  audio.setEngine = function setEngine(speedRatio, on) {
    if (!audio.ctx || audio.muted) {
      if (audio.engineGain) audio.engineGain.gain.value = 0;
      return;
    }
    const target = on ? 0.05 + speedRatio * 0.06 : 0;
    audio.engineGain.gain.setTargetAtTime(target, audio.ctx.currentTime, 0.08);
    audio.engineOsc.frequency.setTargetAtTime(50 + speedRatio * 130, audio.ctx.currentTime, 0.1);
  };

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!audio.ctx || audio.muted) return;
    const t0 = audio.ctx.currentTime + when;
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!audio.ctx || audio.muted) return;
    const len = Math.floor(audio.ctx.sampleRate * dur);
    const buffer = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = audio.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = audio.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start();
  }

  audio.shot = function shot() {
    noise(0.14, 0.5, 1800);
    tone(160, 0.08, 'square', 0.12, 0, 60);
  };
  audio.pickup = function pickup() {
    tone(660, 0.1, 'sine', 0.22);
    tone(880, 0.12, 'sine', 0.22, 0.09);
    tone(1320, 0.16, 'sine', 0.18, 0.18);
  };
  audio.missionDone = function missionDone() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.25, i * 0.12));
  };
  audio.busted = function busted() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.16, i * 0.16));
  };
  audio.crash = function crash() {
    noise(0.25, 0.4, 500);
  };
  audio.click = function click() {
    tone(880, 0.05, 'square', 0.1);
  };
  audio.siren = function siren(dt) {
    if (!audio.ctx || audio.muted) return;
    audio.sirenTimer += dt;
    // Two-tone wail, one blip per frame slice is enough at 60fps.
    if (audio.sirenTimer > 0.45) {
      audio.sirenTimer = 0;
      const hi = audio.sirenHi = !audio.sirenHi;
      tone(hi ? 960 : 720, 0.42, 'sine', 0.05);
    }
  };
  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    if (audio.engineGain) audio.engineGain.gain.value = 0;
    return audio.muted;
  };
  return audio;
}
