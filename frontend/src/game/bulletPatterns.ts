export type BulletPatternId =
  'aimed' | 'fan-3' | 'fan-5' | 'radial-8' | 'cross-4' | 'telegraphed-fan-3';

export interface Point {
  x: number;
  y: number;
}

export interface BulletVelocity {
  x: number;
  y: number;
}

const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;

const velocitiesAtAngles = (angles: number[], speed: number): BulletVelocity[] =>
  angles.map((angle) => ({ x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }));

export function createBulletPattern(
  pattern: BulletPatternId,
  origin: Point,
  target: Point,
  speed: number,
): BulletVelocity[] {
  const aimedAngle = Math.atan2(target.y - origin.y, target.x - origin.x);
  if (pattern === 'aimed') return velocitiesAtAngles([aimedAngle], speed);
  if (pattern === 'fan-3' || pattern === 'telegraphed-fan-3')
    return velocitiesAtAngles(
      [-18, 0, 18].map((offset) => aimedAngle + degreesToRadians(offset)),
      speed,
    );
  if (pattern === 'fan-5')
    return velocitiesAtAngles(
      [-32, -16, 0, 16, 32].map((offset) => aimedAngle + degreesToRadians(offset)),
      speed,
    );
  const count = pattern === 'radial-8' ? 8 : 4;
  const startAngle = pattern === 'cross-4' ? Math.PI / 4 : 0;
  return velocitiesAtAngles(
    Array.from({ length: count }, (_, index) => startAngle + (index * Math.PI * 2) / count),
    speed,
  );
}
