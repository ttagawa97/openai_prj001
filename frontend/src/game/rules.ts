export type TargetClass = 'air' | 'ground';
export type AttackClass = 'air' | 'ground';
export const canDamage = (attack: AttackClass, target: TargetClass) => attack === target;
export const activeAttacks = (airKeyDown: boolean, groundKeyDown: boolean): AttackClass[] => {
  const attacks: AttackClass[] = [];
  if (airKeyDown) attacks.push('air');
  if (groundKeyDown) attacks.push('ground');
  return attacks;
};
export const clampPlayer = (x: number, y: number) => ({
  x: Math.max(22, Math.min(518, x)),
  y: Math.max(90, Math.min(930, y)),
});
export const groundTargetPosition = (playerX: number, playerY: number) => ({
  x: playerX,
  y: Math.max(100, playerY - 210),
});
