import { describe, expect, it } from 'vitest';
import { createBulletPattern, type BulletPatternId } from './bulletPatterns';

describe('enemy bullet patterns', () => {
  const origin = { x: 100, y: 100 };
  const target = { x: 100, y: 300 };

  it.each<[BulletPatternId, number]>([
    ['aimed', 1],
    ['fan-3', 3],
    ['fan-5', 5],
    ['radial-8', 8],
    ['cross-4', 4],
    ['telegraphed-fan-3', 3],
  ])('creates the expected bullet count for %s', (pattern, count) => {
    expect(createBulletPattern(pattern, origin, target, 200)).toHaveLength(count);
  });

  it('aims at the captured target position with the requested speed', () => {
    const [velocity] = createBulletPattern('aimed', origin, target, 200);
    expect(velocity!.x).toBeCloseTo(0);
    expect(velocity!.y).toBeCloseTo(200);
  });

  it('keeps every radial bullet at the requested speed', () => {
    createBulletPattern('radial-8', origin, target, 180).forEach((velocity) => {
      expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(180);
    });
  });
});
