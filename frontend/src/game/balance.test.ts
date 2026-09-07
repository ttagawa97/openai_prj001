import { describe, expect, it } from 'vitest';
import { ENEMY_BULLET_SPEED_SCALE, NORMAL_ENEMY_HP, scaledEnemyBulletSpeed } from './balance';

describe('combat balance', () => {
  it('reduces all enemy bullet speeds to eighty percent', () => {
    expect(ENEMY_BULLET_SPEED_SCALE).toBe(0.8);
    expect(scaledEnemyBulletSpeed(250)).toBe(200);
  });

  it('sets normal enemies to one hit point', () => {
    expect(NORMAL_ENEMY_HP).toBe(1);
  });
});
