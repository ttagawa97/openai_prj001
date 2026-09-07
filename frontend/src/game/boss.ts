import type { BulletPatternId } from './bulletPatterns';

export type BossEncounterStatus = 'active' | 'defeated' | 'retreated';

export interface BossPhaseDefinition {
  id: string;
  startsAtHpRatio: number;
  patterns: BulletPatternId[];
  bulletIntervalMultiplier: number;
  bulletSpeedMultiplier: number;
}

export interface BossDefinition {
  name: string;
  hp: number;
  timeout: number;
  score: number;
  bulletInterval: number;
  phases: BossPhaseDefinition[];
}

export interface BossEncounter {
  status: BossEncounterStatus;
  hp: number;
  maxHp: number;
  remainingMs: number;
  attackCount: number;
}

export const beginBossEncounter = (definition: BossDefinition): BossEncounter => ({
  status: 'active',
  hp: definition.hp,
  maxHp: definition.hp,
  remainingMs: definition.timeout * 1000,
  attackCount: 0,
});

export function damageBoss(encounter: BossEncounter, damage: number): BossEncounterStatus {
  if (encounter.status !== 'active') return encounter.status;
  encounter.hp = Math.max(0, encounter.hp - Math.max(0, damage));
  if (encounter.hp === 0) encounter.status = 'defeated';
  return encounter.status;
}

export function advanceBossTimer(encounter: BossEncounter, deltaMs: number): BossEncounterStatus {
  if (encounter.status !== 'active') return encounter.status;
  encounter.remainingMs = Math.max(0, encounter.remainingMs - Math.max(0, deltaMs));
  if (encounter.remainingMs === 0) encounter.status = 'retreated';
  return encounter.status;
}

export function currentBossPhase(
  definition: BossDefinition,
  encounter: BossEncounter,
): BossPhaseDefinition {
  const hpRatio = encounter.hp / encounter.maxHp;
  return (
    [...definition.phases]
      .sort((left, right) => right.startsAtHpRatio - left.startsAtHpRatio)
      .find((phase) => hpRatio >= phase.startsAtHpRatio) ?? definition.phases.at(-1)!
  );
}

export function nextBossPattern(
  definition: BossDefinition,
  encounter: BossEncounter,
): BulletPatternId {
  const phase = currentBossPhase(definition, encounter);
  const pattern = phase.patterns[encounter.attackCount % phase.patterns.length]!;
  encounter.attackCount += 1;
  return pattern;
}

export function validateBossDefinition(definition: BossDefinition): string[] {
  const errors: string[] = [];
  if (!definition.name || definition.hp <= 0 || definition.timeout <= 0 || definition.score <= 0)
    errors.push('ボスの基本設定が不正です');
  if (definition.bulletInterval <= 0 || definition.phases.length < 2)
    errors.push('ボスの攻撃フェーズ設定が不正です');
  definition.phases.forEach((phase) => {
    if (
      !phase.id ||
      phase.startsAtHpRatio <= 0 ||
      phase.startsAtHpRatio > 1 ||
      phase.patterns.length === 0 ||
      phase.bulletIntervalMultiplier <= 0 ||
      phase.bulletSpeedMultiplier <= 0
    )
      errors.push(`ボスフェーズ ${phase.id || '(unknown)'} が不正です`);
  });
  return errors;
}
