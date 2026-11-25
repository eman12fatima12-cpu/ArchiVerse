import { BuildingType } from '../types/archiverse';

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'triangle',
    gainPeak = 0.08,
    delay = 0,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playBuild(type: BuildingType): void {
    if (type === 'road') {
      this.playTone(180, 110, 0.09, 'triangle', 0.07);
      return;
    }
    if (type === 'portal_nexus' || type === 'pyramid' || type === 'zoo') {
      this.playTone(320, 640, 0.25, 'sine', 0.08);
      this.playTone(480, 960, 0.3, 'triangle', 0.05, 0.07);
      return;
    }
    this.playTone(150, 85, 0.12, 'triangle', 0.09);
    this.playTone(340, 460, 0.14, 'sine', 0.05, 0.04);
  }

  playDemolish(): void {
    this.playTone(140, 52, 0.18, 'sawtooth', 0.06);
  }

  playUndo(): void {
    this.playTone(420, 240, 0.14, 'sine', 0.06);
  }

  playBranch(): void {
    this.playTone(330, 440, 0.16, 'sine', 0.07, 0);
    this.playTone(440, 554, 0.18, 'sine', 0.07, 0.08);
    this.playTone(554, 660, 0.24, 'triangle', 0.06, 0.16);
  }

  playRoute(): void {
    this.playTone(520, 780, 0.14, 'sine', 0.06);
  }

  playError(): void {
    this.playTone(190, 120, 0.15, 'square', 0.04);
  }
}

export const synthAudio = new SynthAudioEngine();
