import type { TargetClass } from './rules';

export type DestructionScale = 'normal' | 'midboss' | 'boss';

export interface DestructionEffectProfile {
  coreColor: number;
  fragmentColor: number;
  particleCount: number;
  fragmentCount: number;
  radius: number;
  durationMs: number;
  hitStopMs: number;
  cameraShake: number;
  cameraShakeMs: number;
  explosionBursts: number;
}

export const playerDestructionEffectProfile = (): DestructionEffectProfile => ({
  coreColor: 0xd8f8ff,
  fragmentColor: 0x48d7ff,
  particleCount: 24,
  fragmentCount: 12,
  radius: 155,
  durationMs: 680,
  hitStopMs: 55,
  cameraShake: 0.009,
  cameraShakeMs: 420,
  explosionBursts: 3,
});

export function destructionEffectProfile(
  target: TargetClass,
  scale: DestructionScale,
): DestructionEffectProfile {
  const coreColor = target === 'air' ? 0xfff2d0 : 0xffd45c;
  const fragmentColor = target === 'air' ? 0xff4d5a : 0x9a6a24;
  if (scale === 'boss')
    return {
      coreColor,
      fragmentColor,
      particleCount: 34,
      fragmentCount: 16,
      radius: 210,
      durationMs: 820,
      hitStopMs: 75,
      cameraShake: 0.012,
      cameraShakeMs: 620,
      explosionBursts: 5,
    };
  if (scale === 'midboss')
    return {
      coreColor,
      fragmentColor,
      particleCount: 22,
      fragmentCount: 10,
      radius: 145,
      durationMs: 650,
      hitStopMs: 50,
      cameraShake: 0.008,
      cameraShakeMs: 360,
      explosionBursts: 3,
    };
  return {
    coreColor,
    fragmentColor,
    particleCount: target === 'ground' ? 12 : 10,
    fragmentCount: target === 'ground' ? 7 : 5,
    radius: target === 'ground' ? 90 : 75,
    durationMs: 460,
    hitStopMs: 28,
    cameraShake: 0.003,
    cameraShakeMs: 110,
    explosionBursts: 1,
  };
}
