// Everything is synthesised at runtime - no audio assets, no loading screen.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.volume = 0.7;
    this.musicEnabled = true;
    this.musicTimer = null;
    this.step = 0;
    this.nextNoteTime = 0;
    this.intensity = 0;
  }

  /** Must be called from a user gesture (browser autoplay policy). */
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.0;
    this.musicGain.connect(this.master);
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  setMusicEnabled(on) {
    this.musicEnabled = on;
    if (!on) this.stopMusic();
  }

  get t() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  env(node, time, attack, decay, peak = 1) {
    const g = node.gain;
    g.cancelScheduledValues(time);
    g.setValueAtTime(0.0001, time);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), time + attack);
    g.exponentialRampToValueAtTime(0.0001, time + attack + decay);
  }

  tone({ freq = 440, type = 'sine', dur = 0.2, attack = 0.005, vol = 0.3, slide = 0, dest = null, detune = 0 }) {
    if (!this.ctx) return;
    const t = this.t;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    if (detune) osc.detune.value = detune;
    osc.connect(gain).connect(dest || this.sfxGain);
    this.env(gain, t, attack, dur, vol);
    osc.start(t);
    osc.stop(t + dur + attack + 0.05);
  }

  noise({ dur = 0.2, vol = 0.3, freq = 1200, q = 1, type = 'lowpass', slide = 0 }) {
    if (!this.ctx) return;
    const t = this.t;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t);
    filter.Q.value = q;
    if (slide) filter.frequency.exponentialRampToValueAtTime(Math.max(60, freq + slide), t + dur);
    const gain = this.ctx.createGain();
    src.connect(filter).connect(gain).connect(this.sfxGain);
    this.env(gain, t, 0.004, dur, vol);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  sfx(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'shoot':
        this.tone({ freq: 880, type: 'square', dur: 0.07, vol: 0.12, slide: 620 });
        this.noise({ dur: 0.05, vol: 0.05, freq: 3000, slide: -2000, type: 'highpass' });
        break;
      case 'mush':
        this.tone({ freq: 240, type: 'triangle', dur: 0.06, vol: 0.09, slide: -80 });
        break;
      case 'mushKill':
        this.noise({ dur: 0.16, vol: 0.16, freq: 900, slide: -700 });
        break;
      case 'segment':
        this.tone({ freq: 520, type: 'sawtooth', dur: 0.1, vol: 0.14, slide: -320 });
        this.noise({ dur: 0.12, vol: 0.1, freq: 1800, slide: -1400 });
        break;
      case 'head':
        this.tone({ freq: 300, type: 'square', dur: 0.2, vol: 0.18, slide: -180 });
        this.noise({ dur: 0.22, vol: 0.14, freq: 1400, slide: -1100 });
        break;
      case 'enemy':
        this.tone({ freq: 180, type: 'sawtooth', dur: 0.3, vol: 0.2, slide: -120 });
        this.noise({ dur: 0.3, vol: 0.18, freq: 800, slide: -600 });
        break;
      case 'powerup':
        [523, 659, 784, 1046].forEach((f, i) => {
          setTimeout(() => this.tone({ freq: f, type: 'triangle', dur: 0.14, vol: 0.18 }), i * 55);
        });
        break;
      case 'dash':
        this.noise({ dur: 0.18, vol: 0.14, freq: 500, slide: 2600, type: 'bandpass', q: 2 });
        break;
      case 'surge':
        [220, 330, 440, 660, 880].forEach((f, i) => {
          setTimeout(() => this.tone({ freq: f, type: 'sawtooth', dur: 0.3, vol: 0.14 }), i * 70);
        });
        break;
      case 'death':
        this.tone({ freq: 400, type: 'sawtooth', dur: 0.8, vol: 0.25, slide: -370 });
        this.noise({ dur: 0.9, vol: 0.22, freq: 1200, slide: -1100 });
        break;
      case 'wave':
        [440, 554, 659, 880].forEach((f, i) => {
          setTimeout(() => this.tone({ freq: f, type: 'square', dur: 0.18, vol: 0.13 }), i * 90);
        });
        break;
      case 'boss':
        this.tone({ freq: 90, type: 'sawtooth', dur: 1.4, vol: 0.3, slide: 40 });
        this.noise({ dur: 1.3, vol: 0.18, freq: 300, slide: 400 });
        break;
      case 'bossHit':
        this.tone({ freq: 140, type: 'square', dur: 0.09, vol: 0.14, slide: 60 });
        break;
      case 'ui':
        this.tone({ freq: 660, type: 'triangle', dur: 0.07, vol: 0.1 });
        break;
      case 'gameover':
        [440, 370, 294, 220].forEach((f, i) => {
          setTimeout(() => this.tone({ freq: f, type: 'sawtooth', dur: 0.4, vol: 0.18 }), i * 180);
        });
        break;
      default:
        break;
    }
  }

  // --- procedural soundtrack: a dark synthwave arpeggio that thickens with intensity
  startMusic() {
    if (!this.ctx || !this.musicEnabled || this.musicTimer) return;
    this.musicGain.gain.cancelScheduledValues(this.t);
    this.musicGain.gain.setValueAtTime(0.0001, this.t);
    this.musicGain.gain.linearRampToValueAtTime(0.5, this.t + 2);
    this.step = 0;
    this.nextNoteTime = this.t + 0.1;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 25);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.musicGain) {
      const t = this.t;
      this.musicGain.gain.cancelScheduledValues(t);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, t);
      this.musicGain.gain.linearRampToValueAtTime(0.0001, t + 0.6);
    }
  }

  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  scheduleMusic() {
    if (!this.ctx) return;
    const bpm = 104 + this.intensity * 26;
    const spb = 60 / bpm / 4; // sixteenth notes
    while (this.nextNoteTime < this.t + 0.2) {
      this.playStep(this.step, this.nextNoteTime, spb);
      this.nextNoteTime += spb;
      this.step = (this.step + 1) % 32;
    }
  }

  playStep(step, time, spb) {
    const roots = [55, 55, 61.74, 49]; // A, A, B, G minor-ish vamp
    const root = roots[Math.floor(step / 8) % roots.length];
    // bass on the beat
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420 + this.intensity * 700;
      osc.type = 'sawtooth';
      osc.frequency.value = root;
      osc.connect(f).connect(g).connect(this.musicGain);
      this.env(g, time, 0.01, spb * 3.2, 0.28);
      osc.start(time);
      osc.stop(time + spb * 4);
    }
    // arpeggio
    const arp = [0, 7, 12, 15, 12, 7, 19, 12];
    if (step % 2 === 0) {
      const semis = arp[(step / 2) % arp.length];
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = root * 4 * Math.pow(2, semis / 12);
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      osc.connect(g);
      if (pan) {
        pan.pan.value = ((step % 4) - 1.5) / 3;
        g.connect(pan).connect(this.musicGain);
      } else {
        g.connect(this.musicGain);
      }
      this.env(g, time, 0.005, spb * 1.6, 0.055 + this.intensity * 0.05);
      osc.start(time);
      osc.stop(time + spb * 2);
    }
    // hats once intensity picks up
    if (this.intensity > 0.25 && step % 2 === 1) {
      const len = Math.floor(this.ctx.sampleRate * 0.03);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const hp = this.ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 6500;
      const g = this.ctx.createGain();
      g.gain.value = 0.04 * this.intensity;
      src.connect(hp).connect(g).connect(this.musicGain);
      src.start(time);
    }
  }
}
