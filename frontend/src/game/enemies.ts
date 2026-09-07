import type { TargetClass } from './rules';
import type { BulletPatternId } from './bulletPatterns';

export type EnemyArchetypeId =
  'air-scout' | 'air-interceptor' | 'air-gunship' | 'ground-tank' | 'ground-flak' | 'ground-turret';

export interface EnemyArchetype {
  id: EnemyArchetypeId;
  targetClass: TargetClass;
  textureKey: string;
  hpMultiplier: number;
  speedMultiplier: number;
  score: number;
  attackPattern: BulletPatternId;
  attackCooldownMultiplier: number;
  bulletSpeedMultiplier: number;
}

export const enemyArchetypes: Record<EnemyArchetypeId, EnemyArchetype> = {
  'air-scout': {
    id: 'air-scout',
    targetClass: 'air',
    textureKey: 'airScout',
    hpMultiplier: 1,
    speedMultiplier: 1,
    score: 200,
    attackPattern: 'aimed',
    attackCooldownMultiplier: 1,
    bulletSpeedMultiplier: 1,
  },
  'air-interceptor': {
    id: 'air-interceptor',
    targetClass: 'air',
    textureKey: 'airInterceptor',
    hpMultiplier: 1,
    speedMultiplier: 1.35,
    score: 300,
    attackPattern: 'fan-3',
    attackCooldownMultiplier: 1.35,
    bulletSpeedMultiplier: 1.05,
  },
  'air-gunship': {
    id: 'air-gunship',
    targetClass: 'air',
    textureKey: 'airGunship',
    hpMultiplier: 1,
    speedMultiplier: 0.65,
    score: 800,
    attackPattern: 'radial-8',
    attackCooldownMultiplier: 2.2,
    bulletSpeedMultiplier: 0.8,
  },
  'ground-tank': {
    id: 'ground-tank',
    targetClass: 'ground',
    textureKey: 'groundTank',
    hpMultiplier: 1,
    speedMultiplier: 1,
    score: 350,
    attackPattern: 'aimed',
    attackCooldownMultiplier: 1,
    bulletSpeedMultiplier: 0.9,
  },
  'ground-flak': {
    id: 'ground-flak',
    targetClass: 'ground',
    textureKey: 'groundFlak',
    hpMultiplier: 1,
    speedMultiplier: 0.8,
    score: 500,
    attackPattern: 'fan-5',
    attackCooldownMultiplier: 1.8,
    bulletSpeedMultiplier: 0.75,
  },
  'ground-turret': {
    id: 'ground-turret',
    targetClass: 'ground',
    textureKey: 'groundTurret',
    hpMultiplier: 1,
    speedMultiplier: 0.45,
    score: 750,
    attackPattern: 'telegraphed-fan-3',
    attackCooldownMultiplier: 2.1,
    bulletSpeedMultiplier: 1.1,
  },
};

const AIR_PROGRESSION: EnemyArchetypeId[][] = [
  ['air-scout'],
  ['air-scout', 'air-interceptor'],
  ['air-scout', 'air-interceptor', 'air-gunship'],
];
const GROUND_PROGRESSION: EnemyArchetypeId[][] = [
  ['ground-tank'],
  ['ground-tank', 'ground-flak'],
  ['ground-tank', 'ground-flak', 'ground-turret'],
];

export const availableEnemyArchetypes = (
  stageId: number,
  targetClass: TargetClass,
): EnemyArchetypeId[] => {
  const progressionIndex = Math.min(2, Math.max(0, stageId - 1));
  return [...(targetClass === 'air' ? AIR_PROGRESSION : GROUND_PROGRESSION)[progressionIndex]!];
};

export const selectEnemyArchetype = (
  stageId: number,
  targetClass: TargetClass,
  waveIndex: number,
): EnemyArchetypeId => {
  const available = availableEnemyArchetypes(stageId, targetClass);
  return available[waveIndex % available.length]!;
};

export function validateEnemyArchetypes(): string[] {
  const errors: string[] = [];
  Object.entries(enemyArchetypes).forEach(([id, archetype]) => {
    if (id !== archetype.id) errors.push(`enemy archetype ${id} のIDが不正です`);
    if (
      archetype.hpMultiplier !== 1 ||
      archetype.speedMultiplier <= 0 ||
      archetype.score <= 0 ||
      archetype.attackCooldownMultiplier < 1 ||
      archetype.bulletSpeedMultiplier <= 0
    )
      errors.push(`enemy archetype ${id} の数値が不正です`);
  });
  return errors;
}
