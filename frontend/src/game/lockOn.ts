export const MAX_GROUND_LOCKS = 3;
export const LOCK_ON_RADIUS = 34;

export interface Position {
  x: number;
  y: number;
}

export function isInsideLockOnRadius(reticle: Position, target: Position): boolean {
  return Math.hypot(reticle.x - target.x, reticle.y - target.y) <= LOCK_ON_RADIUS;
}

export function addLock<T>(locks: T[], target: T): T[] {
  if (locks.includes(target) || locks.length >= MAX_GROUND_LOCKS) return locks;
  return [...locks, target];
}

export function quadraticLaserPoint(
  start: Position,
  control: Position,
  end: Position,
  progress: number,
): Position {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}
