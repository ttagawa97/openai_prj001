let context: AudioContext | undefined;
let musicTimer: number | undefined;
let noteIndex = 0;
const melody = [220, 277, 330, 440, 330, 277, 247, 330];

function tone(
  frequency: number,
  duration: number,
  volume: number,
  wave: OscillatorType = 'square',
) {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(volume, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

export function startBgm() {
  stopBgm();
  tone(melody[0]!, 0.16, 0.025, 'triangle');
  musicTimer = window.setInterval(() => {
    noteIndex = (noteIndex + 1) % melody.length;
    tone(melody[noteIndex]!, 0.16, 0.025, 'triangle');
  }, 220);
}

export function stopBgm() {
  if (musicTimer !== undefined) window.clearInterval(musicTimer);
  musicTimer = undefined;
}

export const playShot = () => tone(720, 0.05, 0.018);
export const playBomb = () => tone(110, 0.22, 0.04, 'sawtooth');
export const playExplosion = () => tone(70, 0.28, 0.055, 'sawtooth');
export const playClear = () =>
  [523, 659, 784].forEach((frequency, index) =>
    window.setTimeout(() => tone(frequency, 0.3, 0.04, 'triangle'), index * 160),
  );
