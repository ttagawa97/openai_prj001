import { describe, expect, it } from 'vitest';
import { addLock, isInsideLockOnRadius, MAX_GROUND_LOCKS, quadraticLaserPoint } from './lockOn';

describe('ground lock-on', () => {
  it('detects targets inside the reticle radius', () => {
    expect(isInsideLockOnRadius({ x: 100, y: 100 }, { x: 120, y: 110 })).toBe(true);
    expect(isInsideLockOnRadius({ x: 100, y: 100 }, { x: 140, y: 100 })).toBe(false);
  });

  it('retains unique targets up to three locks', () => {
    const targets = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    let locks: typeof targets = [];
    targets.forEach((target) => (locks = addLock(locks, target)));
    expect(locks).toEqual(targets.slice(0, MAX_GROUND_LOCKS));
    expect(addLock(locks, targets[0]!)).toBe(locks);
  });

  it('produces a curved laser path with exact endpoints', () => {
    const start = { x: 0, y: 100 };
    const control = { x: 80, y: 20 };
    const end = { x: 100, y: 0 };
    expect(quadraticLaserPoint(start, control, end, 0)).toEqual(start);
    expect(quadraticLaserPoint(start, control, end, 1)).toEqual(end);
    expect(quadraticLaserPoint(start, control, end, 0.5)).toEqual({ x: 65, y: 35 });
  });
});
