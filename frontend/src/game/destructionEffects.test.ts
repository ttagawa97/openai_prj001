import { describe, expect, it } from 'vitest';
import { destructionEffectProfile, playerDestructionEffectProfile } from './destructionEffects';

describe('destruction effect profiles', () => {
  it('makes ground destruction heavier than a normal air explosion', () => {
    const air = destructionEffectProfile('air', 'normal');
    const ground = destructionEffectProfile('ground', 'normal');
    expect(ground.particleCount).toBeGreaterThan(air.particleCount);
    expect(ground.radius).toBeGreaterThan(air.radius);
    expect(ground.fragmentColor).not.toBe(air.fragmentColor);
  });

  it('scales impact, hit stop, and chained bursts for larger enemies', () => {
    const normal = destructionEffectProfile('air', 'normal');
    const midboss = destructionEffectProfile('air', 'midboss');
    const boss = destructionEffectProfile('air', 'boss');
    expect(midboss.hitStopMs).toBeGreaterThan(normal.hitStopMs);
    expect(boss.cameraShake).toBeGreaterThan(midboss.cameraShake);
    expect([normal.explosionBursts, midboss.explosionBursts, boss.explosionBursts]).toEqual([
      1, 3, 5,
    ]);
  });

  it('gives player destruction a distinct cyan multi-burst profile', () => {
    const player = playerDestructionEffectProfile();
    const enemy = destructionEffectProfile('air', 'normal');
    expect(player.fragmentColor).toBe(0x48d7ff);
    expect(player.explosionBursts).toBe(3);
    expect(player.particleCount).toBeGreaterThan(enemy.particleCount);
  });
});
