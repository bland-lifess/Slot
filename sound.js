/* =========================================================
   SLOT SURGE — sound.js
   Every sound here is synthesized in real time with the Web
   Audio API (oscillators + gain envelopes). No audio files,
   nothing to license, nothing to fetch — it just works the
   moment this is hosted anywhere.
   ========================================================= */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.muted = false;
    this.spinInterval = null;
    this.ambientNodes = null;
  }

  // Must be called from inside a user-gesture handler (click/tap)
  // because browsers block audio until the user interacts.
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 0.65;
    this.masterGain.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.65, this.ctx.currentTime, 0.05);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // Core tone helper: oscillator + short attack/decay envelope.
  _tone(type, freq, startTime, duration, peakGain, freqEnd) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(freq, 1), startTime);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), startTime + duration);
    }
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(peakGain, 0.001), startTime + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    osc.connect(gain).connect(this.masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.03);
  }

  playClick() {
    this.resume();
    if (!this.ctx) return;
    this._tone('square', 340, this.ctx.currentTime, 0.05, 0.14);
  }

  playReelStop(index) {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone('triangle', 200 + (index || 0) * 8, t, 0.1, 0.28, 85);
  }

  playReelTick(index) {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone('square', 380 + (index || 0) * 6, t, 0.045, 0.1, 260);
  }

  startSpinLoop() {
    this.resume();
    if (!this.ctx || this.spinInterval) return;
    this.spinInterval = setInterval(() => {
      if (!this.ctx) return;
      this._tone('square', 720, this.ctx.currentTime, 0.028, 0.05);
    }, 65);
  }

  stopSpinLoop() {
    if (this.spinInterval) {
      clearInterval(this.spinInterval);
      this.spinInterval = null;
    }
  }

  playCoinBlip(pitchIndex) {
    this.resume();
    if (!this.ctx) return;
    const freq = 640 + (pitchIndex % 10) * 65;
    this._tone('sine', freq, this.ctx.currentTime, 0.13, 0.22, freq * 1.4);
  }

  playFanfare(big) {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = big
      ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
      : [523.25, 659.25, 783.99];
    notes.forEach((f, i) => this._tone('triangle', f, t + i * 0.09, 0.35, 0.2));
    if (big) notes.forEach((f, i) => this._tone('sine', f * 2, t + i * 0.09 + 0.02, 0.3, 0.06));
  }

  playPurchase() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this._tone('sine', 880, t, 0.08, 0.18);
    this._tone('sine', 1320, t + 0.06, 0.14, 0.16);
  }

  playError() {
    this.resume();
    if (!this.ctx) return;
    this._tone('sawtooth', 160, this.ctx.currentTime, 0.16, 0.14, 85);
  }

  playQuotaMet() {
    this.playFanfare(false);
  }

  playFreeSpins() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [440, 554.37, 659.25, 880, 1108.7].forEach((f, i) =>
      this._tone('square', f, t + i * 0.07, 0.24, 0.14)
    );
  }

  playGameOver() {
    this.resume();
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [392, 349.23, 293.66, 220].forEach((f, i) =>
      this._tone('sawtooth', f, t + i * 0.18, 0.32, 0.16)
    );
  }

  playUnlucky() {
    this.resume();
    if (!this.ctx) return;
    this._tone('sawtooth', 180, this.ctx.currentTime, 0.3, 0.1, 60);
  }

  // Very quiet detuned drone — pure atmosphere, gated entirely
  // by masterGain so muting silences it too.
  startAmbient() {
    this.resume();
    if (!this.ctx || this.ambientNodes) return;
    const o1 = this.ctx.createOscillator();
    const o2 = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o1.type = 'sine';
    o2.type = 'sine';
    o1.frequency.value = 110;
    o2.frequency.value = 110.6;
    g.gain.value = 0.018;
    o1.connect(g);
    o2.connect(g);
    g.connect(this.masterGain);
    o1.start();
    o2.start();
    this.ambientNodes = [o1, o2, g];
  }

  stopAmbient() {
    if (!this.ambientNodes) return;
    this.ambientNodes.forEach((n) => {
      try { n.stop && n.stop(); } catch (e) { /* already stopped */ }
      try { n.disconnect(); } catch (e) { /* already disconnected */ }
    });
    this.ambientNodes = null;
  }
}

window.SFX = new SoundEngine();
