// Tiny WebAudio synth: no audio files. Must be unlocked by a user gesture (iOS Safari).
let ctx: AudioContext | null = null;
let muted = false;
try {
  muted = localStorage.getItem('ember_muted') === '1';
} catch {
  /* ignore */
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try {
    localStorage.setItem('ember_muted', m ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ctx.destination);
    s.start(0);
  } catch {
    /* ignore */
  }
}

const lastAt: Record<string, number> = {};
const MIN_GAP: Record<string, number> = { shoot: 0.09, hit: 0.07, kill: 0.12, meat: 0.06, coin: 0.05, tick: 0.06, hurt: 0.2, hire: 0, clear: 0, boom: 0.25 };
let ends: number[] = [];

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo = 0, delay = 0) {
  if (!ctx) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
  ends.push(t0 + dur);
}

export function sfx(name: string) {
  if (muted || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (lastAt[name] ?? -9) < (MIN_GAP[name] ?? 0.05)) return;
  ends = ends.filter((e) => e > now);
  const big = name === 'hire' || name === 'clear';
  if (!big && ends.length >= 7) return; // keep it from piling up / clipping
  lastAt[name] = now;
  switch (name) {
    case 'shoot':
      tone(760, 0.07, 'square', 0.07, 180);
      break;
    case 'hit':
      tone(320, 0.05, 'triangle', 0.1, 160);
      break;
    case 'kill':
      tone(240, 0.24, 'sawtooth', 0.11, 55);
      tone(120, 0.2, 'sine', 0.16, 50);
      break;
    case 'meat':
      tone(520, 0.07, 'sine', 0.14, 820);
      break;
    case 'coin':
      tone(988, 0.05, 'sine', 0.11);
      tone(1319, 0.09, 'sine', 0.11, 0, 0.05);
      break;
    case 'tick':
      tone(1250, 0.03, 'sine', 0.06);
      break;
    case 'hurt':
      tone(190, 0.18, 'sawtooth', 0.13, 80);
      break;
    case 'boom':
      tone(150, 0.3, 'sawtooth', 0.16, 40);
      tone(90, 0.35, 'sine', 0.2, 35);
      break;
    case 'hire':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 'triangle', 0.13, 0, i * 0.07));
      break;
    case 'clear':
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, 'triangle', 0.14, 0, i * 0.09));
      tone(262, 0.7, 'sine', 0.1, 0, 0.1);
      break;
  }
}
