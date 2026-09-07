import { gameSettings, volumeScale } from './game/settings';

let context: AudioContext | undefined;
let musicTimer: number | undefined;
let noteIndex = 0;
export type MusicMode = 'stage' | 'boss';
export type DestructionSoundScale = 'normal' | 'midboss' | 'boss';

export const soundtracks: Record<MusicMode, readonly number[]> = {
  stage: [220, 277, 330, 440, 330, 277, 247, 330],
  boss: [110, 165, 147, 220, 123, 185, 165, 247],
};

export const soundtrackForMode = (mode: MusicMode) => soundtracks[mode];
type AudioChannel = 'bgm' | 'sfx';

function tone(
  frequency: number,
  duration: number,
  volume: number,
  wave: OscillatorType = 'square',
  channel: AudioChannel = 'sfx',
) {
  context ??= new AudioContext();
  if (context.state === 'suspended') void context.resume();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = wave;
  oscillator.frequency.value = frequency;
  const configuredVolume = channel === 'bgm' ? gameSettings.bgmVolume : gameSettings.sfxVolume;
  gain.gain.setValueAtTime(volume * volumeScale(configuredVolume), context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

export function startBgm(mode: MusicMode = 'stage') {
  stopBgm();
  noteIndex = 0;
  const melody = soundtrackForMode(mode);
  tone(melody[0]!, 0.16, 0.025, 'triangle', 'bgm');
  musicTimer = window.setInterval(
    () => {
      noteIndex = (noteIndex + 1) % melody.length;
      tone(
        melody[noteIndex]!,
        mode === 'boss' ? 0.12 : 0.16,
        mode === 'boss' ? 0.032 : 0.025,
        mode === 'boss' ? 'sawtooth' : 'triangle',
        'bgm',
      );
    },
    mode === 'boss' ? 165 : 220,
  );
}

export function stopBgm() {
  if (musicTimer !== undefined) window.clearInterval(musicTimer);
  musicTimer = undefined;
}

export const playShot = () => tone(720, 0.05, 0.018);
export const playLockOn = (lockNumber: number) =>
  tone(520 + Math.max(1, Math.min(3, lockNumber)) * 90, 0.1, 0.025, 'square');
export const playGroundLaser = () => {
  tone(180, 0.28, 0.035, 'sawtooth');
  window.setTimeout(() => tone(760, 0.2, 0.025, 'sine'), 55);
};
export const playExplosion = () => tone(70, 0.28, 0.055, 'sawtooth');
export function playDestruction(scale: DestructionSoundScale) {
  const frequencies =
    scale === 'boss' ? [72, 48, 92, 38] : scale === 'midboss' ? [82, 55, 110] : [105, 62];
  const interval = scale === 'normal' ? 24 : 65;
  frequencies.forEach((frequency, index) =>
    window.setTimeout(() => {
      tone(frequency, scale === 'normal' ? 0.22 : 0.38, scale === 'boss' ? 0.07 : 0.05, 'sawtooth');
      tone(frequency * 2.1, 0.08, 0.018, 'square');
    }, index * interval),
  );
}
export function playPlayerDestroyed() {
  [170, 95, 52].forEach((frequency, index) =>
    window.setTimeout(() => tone(frequency, 0.34, 0.06, 'sawtooth'), index * 75),
  );
}
export const playEnemyHit = () => tone(180, 0.035, 0.012, 'square');
export const playCheckpoint = () =>
  [440, 660].forEach((frequency, index) =>
    window.setTimeout(() => tone(frequency, 0.16, 0.03, 'triangle'), index * 90),
  );
export const playWarning = () =>
  [110, 82, 110].forEach((frequency, index) =>
    window.setTimeout(() => tone(frequency, 0.18, 0.04, 'sawtooth'), index * 170),
  );
export const playBossPhase = () =>
  [330, 247, 165].forEach((frequency, index) =>
    window.setTimeout(() => tone(frequency, 0.12, 0.035, 'square'), index * 70),
  );
export const playSyncBurst = () =>
  [220, 440, 880].forEach((frequency, index) =>
    window.setTimeout(() => tone(frequency, 0.28, 0.04, 'sine'), index * 55),
  );
export const playClear = () =>
  [523, 659, 784].forEach((frequency, index) =>
    window.setTimeout(() => tone(frequency, 0.3, 0.04, 'triangle'), index * 160),
  );
