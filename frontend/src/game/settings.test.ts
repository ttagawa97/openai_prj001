import { describe, expect, it } from 'vitest';
import { adjustVolume, DEFAULT_SETTINGS, volumeScale } from './settings';

describe('game settings', () => {
  it('uses audible but non-maximum defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({ bgmVolume: 70, sfxVolume: 70 });
  });

  it('adjusts volume in ten-point steps and clamps the range', () => {
    expect(adjustVolume(70, -1)).toBe(60);
    expect(adjustVolume(100, 1)).toBe(100);
    expect(adjustVolume(0, -1)).toBe(0);
  });

  it('converts percent volume to an audio gain scale', () => {
    expect(volumeScale(70)).toBe(0.7);
    expect(volumeScale(-10)).toBe(0);
    expect(volumeScale(120)).toBe(1);
  });
});
