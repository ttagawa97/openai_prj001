export interface GameSettings {
  bgmVolume: number;
  sfxVolume: number;
}

export const DEFAULT_SETTINGS: GameSettings = { bgmVolume: 70, sfxVolume: 70 };
export const gameSettings: GameSettings = { ...DEFAULT_SETTINGS };

export function adjustVolume(current: number, direction: -1 | 1): number {
  return Math.max(0, Math.min(100, current + direction * 10));
}

export const volumeScale = (volume: number) => Math.max(0, Math.min(100, volume)) / 100;
