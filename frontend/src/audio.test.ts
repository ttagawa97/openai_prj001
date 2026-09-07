import { describe, expect, it } from 'vitest';
import { soundtracks, soundtrackForMode } from './audio';

describe('generated soundtrack definitions', () => {
  it('provides distinct repeating note sequences for stage and boss play', () => {
    expect(soundtrackForMode('stage')).toBe(soundtracks.stage);
    expect(soundtrackForMode('boss')).toBe(soundtracks.boss);
    expect(soundtracks.stage).not.toEqual(soundtracks.boss);
    expect(soundtracks.stage.length).toBeGreaterThanOrEqual(8);
    expect(soundtracks.boss.every((frequency) => frequency > 0)).toBe(true);
  });
});
