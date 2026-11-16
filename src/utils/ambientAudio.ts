import type { SoundscapeId } from '../types';

class SacredAmbientEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private chimeTimer: number | null = null;
  private currentId: SoundscapeId = 'silence';
  private volume = 0.35;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(nextVolume: number): void {
    this.volume = Math.max(0, Math.min(1, nextVolume));
    if (this.ctx && this.masterGain && this.currentId !== 'silence') {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume * 0.45, now + 0.15);
    }
  }

  public getCurrentId(): SoundscapeId {
    return this.currentId;
  }

  public stop(): void {
    this.currentId = 'silence';
    if (this.chimeTimer !== null) {
      window.clearInterval(this.chimeTimer);
      this.chimeTimer = null;
    }

    const ctx = this.ctx;
    const gain = this.masterGain;
    const nodes = [...this.activeNodes];
    this.activeNodes = [];
    this.masterGain = null;

    if (ctx && gain) {
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0.0001, now + 0.45);
      window.setTimeout(() => {
        nodes.forEach((node) => {
          try {
            if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
              (node as OscillatorNode).stop();
            }
            node.disconnect();
          } catch {
            // ignore already stopped nodes
          }
        });
      }, 500);
    }
  }

  public start(id: SoundscapeId): void {
    if (id === 'silence') {
      this.stop();
      return;
    }

    this.stop();
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.currentId = id;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, ctx.currentTime);
    master.gain.linearRampToValueAtTime(this.volume * 0.45, ctx.currentTime + 1.2);
    master.connect(ctx.destination);
    this.masterGain = master;
    this.activeNodes.push(master);

    if (id === 'cathedral') {
      this.buildCathedralDrone(ctx, master);
    } else if (id === 'chimes') {
      this.buildMorningChimes(ctx, master);
    } else if (id === 'rain') {
      this.buildCloisterRain(ctx, master);
    }
  }

  public playSoftCompletionBell(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const partials = [
      { freq: 528, gain: 0.16, decay: 4.5 },
      { freq: 1056, gain: 0.06, decay: 3.2 },
      { freq: 1584, gain: 0.025, decay: 2.0 },
    ];

    partials.forEach((p) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(p.freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(p.gain * Math.max(0.25, this.volume), now + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + p.decay + 0.1);
    });
  }

  private buildCathedralDrone(ctx: AudioContext, master: GainNode): void {
    // Warm D Lydian sacred pad (D3, A3, E4, F#4)
    const freqs = [146.83, 220.0, 329.63, 369.99];
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, ctx.currentTime);
    filter.Q.setValueAtTime(0.7, ctx.currentTime);
    filter.connect(master);
    this.activeNodes.push(filter);

    // Slow breathing LFO on filter cutoff
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.07, ctx.currentTime);
    lfoGain.gain.setValueAtTime(140, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this.activeNodes.push(lfo, lfoGain);

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const voiceGain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.detune.setValueAtTime((idx - 1.5) * 3.5, ctx.currentTime);
      voiceGain.gain.setValueAtTime(idx === 0 ? 0.3 : 0.16, ctx.currentTime);
      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start();
      this.activeNodes.push(osc, voiceGain);
    });
  }

  private buildMorningChimes(ctx: AudioContext, master: GainNode): void {
    // Subtle pine breeze + gentle periodic sanctuary chimes
    this.buildFilteredNoise(ctx, master, 380, 0.18);

    const pentatonic = [392.0, 440.0, 523.25, 587.33, 659.25];
    const strikeChime = () => {
      if (!this.ctx || this.currentId !== 'chimes' || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const base = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      [1, 2.01].forEach((mult, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(base * mult, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(idx === 0 ? 0.22 : 0.06, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 5.0);
      });
    };

    strikeChime();
    this.chimeTimer = window.setInterval(strikeChime, 6800);
  }

  private buildCloisterRain(ctx: AudioContext, master: GainNode): void {
    this.buildFilteredNoise(ctx, master, 780, 0.42);
  }

  private buildFilteredNoise(
    ctx: AudioContext,
    master: GainNode,
    cutoffHz: number,
    level: number
  ): void {
    const bufferSize = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-ish warm noise approximation
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoffHz, ctx.currentTime);
    filter.Q.setValueAtTime(0.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, ctx.currentTime);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();

    this.activeNodes.push(source, filter, gain);
  }
}

export const ambientAudio = new SacredAmbientEngine();
