// audio.js — all sound is synthesised with WebAudio; no audio files are loaded.
// The context is created lazily on the first user gesture so autoplay rules are happy.

let ctx = null;
let muted = false;
let alarmOsc = null;
let alarmGain = null;

export function setMuted(value) {
  muted = value;
  if (alarmGain) alarmGain.gain.value = muted ? 0 : 0.05;
}

export function isMuted() {
  return muted;
}

function ensureContext() {
  if (!ctx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    ctx = new AudioContext();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// Call from any user gesture (key, click) so later sounds are allowed.
export function unlockAudio() {
  ensureContext();
}

function tone({ freq, endFreq, duration, type = 'sine', volume = 0.12, delay = 0 }) {
  if (muted) return;
  const ac = ensureContext();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq && endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + duration);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

export function playPickup(kind) {
  if (kind === 'diamond') {
    tone({ freq: 880, duration: 0.09, type: 'triangle', volume: 0.14 });
    tone({ freq: 1318, duration: 0.14, type: 'triangle', volume: 0.12, delay: 0.07 });
  } else if (kind === 'art') {
    tone({ freq: 523, duration: 0.1, type: 'sine', volume: 0.12 });
    tone({ freq: 784, duration: 0.16, type: 'sine', volume: 0.12, delay: 0.08 });
  } else {
    tone({ freq: 660, duration: 0.08, type: 'triangle', volume: 0.13 });
    tone({ freq: 990, duration: 0.12, type: 'triangle', volume: 0.11, delay: 0.06 });
  }
}

export function playVault() {
  [523, 659, 784, 1046].forEach((freq, i) =>
    tone({ freq, duration: 0.16, type: 'triangle', volume: 0.14, delay: i * 0.09 }),
  );
}

export function playSpotted() {
  tone({ freq: 220, endFreq: 440, duration: 0.25, type: 'sawtooth', volume: 0.08 });
}

export function playCaught() {
  tone({ freq: 392, endFreq: 98, duration: 0.6, type: 'sawtooth', volume: 0.16 });
  tone({ freq: 196, endFreq: 65, duration: 0.6, type: 'square', volume: 0.08, delay: 0.05 });
}

export function playLevelComplete() {
  [523, 659, 784, 1046, 1318].forEach((freq, i) =>
    tone({ freq, duration: 0.22, type: 'triangle', volume: 0.13, delay: i * 0.1 }),
  );
}

export function playVictory() {
  [523, 659, 784, 1046, 784, 1046, 1318, 1568].forEach((freq, i) =>
    tone({ freq, duration: 0.25, type: 'triangle', volume: 0.13, delay: i * 0.12 }),
  );
}

export function playCoin() {
  // A bright metallic tink, then a softer ring as the coin lands.
  tone({ freq: 2093, duration: 0.06, type: 'triangle', volume: 0.12 });
  tone({ freq: 2637, duration: 0.1, type: 'triangle', volume: 0.09, delay: 0.05 });
  tone({ freq: 1568, duration: 0.16, type: 'sine', volume: 0.06, delay: 0.16 });
}

export function playClick() {
  tone({ freq: 1200, duration: 0.04, type: 'square', volume: 0.05 });
}

export function playStep() {
  tone({ freq: 140, duration: 0.05, type: 'sine', volume: 0.03 });
}

// A soft two-tone alarm that runs while the alarm meter is high.
export function setAlarmSound(on) {
  if (muted) on = false;
  const ac = ensureContext();
  if (!ac) return;
  if (on && !alarmOsc) {
    alarmOsc = ac.createOscillator();
    alarmGain = ac.createGain();
    alarmOsc.type = 'sine';
    alarmOsc.frequency.value = 660;
    alarmGain.gain.value = 0.05;
    const lfo = ac.createOscillator();
    const lfoGain = ac.createGain();
    lfo.frequency.value = 2.2;
    lfoGain.gain.value = 220;
    lfo.connect(lfoGain).connect(alarmOsc.frequency);
    alarmOsc.connect(alarmGain).connect(ac.destination);
    alarmOsc.start();
    lfo.start();
    alarmOsc._lfo = lfo;
  } else if (!on && alarmOsc) {
    try {
      alarmOsc._lfo.stop();
      alarmOsc.stop();
    } catch {
      // already stopped
    }
    alarmOsc = null;
    alarmGain = null;
  }
}
