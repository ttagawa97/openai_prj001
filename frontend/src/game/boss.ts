import type { BulletPatternId } from './bulletPatterns';

export type BossEncounterStatus = 'active' | 'defeated' | 'retreated';
export type BossPartId = 'left-arm' | 'right-arm' | 'core';
export type BossPartStatus = 'active' | 'sealed' | 'exposed' | 'destroyed';
export type BossMotionMode = 'move' | 'barrage-stop';

export interface BossPartDefinition {
  hp: number;
  offsetX: number;
  offsetY: number;
}

export interface BossMovementStopWindow {
  fromMs: number;
  toMs: number;
}

export interface BossMovementCycle {
  periodMs: number;
  stopWindows: BossMovementStopWindow[];
  horizontalAmplitude: number;
  verticalAmplitude: number;
}

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
  parts: Record<BossPartId, BossPartDefinition>;
  movementCycle: BossMovementCycle;
  phases: BossPhaseDefinition[];
}

export interface BossEncounter {
  status: BossEncounterStatus;
  hp: number;
  maxHp: number;
  remainingMs: number;
  attackCount: number;
  parts: Record<BossPartId, { status: BossPartStatus; hp: number }>;
  coreExposed: boolean;
  motionElapsedMs: number;
  motionMode: BossMotionMode;
}

const totalBossHp = (definition: BossDefinition) =>
  definition.parts['left-arm'].hp + definition.parts['right-arm'].hp + definition.parts.core.hp;

const remainingBossHp = (encounter: BossEncounter) =>
  encounter.parts['left-arm'].hp + encounter.parts['right-arm'].hp + encounter.parts.core.hp;

export const beginBossEncounter = (definition: BossDefinition): BossEncounter => {
  const maxHp = totalBossHp(definition);
  return {
    status: 'active',
    hp: maxHp,
    maxHp,
    remainingMs: definition.timeout * 1000,
    attackCount: 0,
    parts: {
      'left-arm': { status: 'active', hp: definition.parts['left-arm'].hp },
      'right-arm': { status: 'active', hp: definition.parts['right-arm'].hp },
      core: { status: 'sealed', hp: definition.parts.core.hp },
    },
    coreExposed: false,
    motionElapsedMs: 0,
    motionMode: 'move',
  };
};

export function isBossCoreExposed(encounter: BossEncounter): boolean {
  return encounter.coreExposed;
}

export function damageBoss(encounter: BossEncounter, damage: number): BossEncounterStatus {
  return damageBossPart(encounter, 'core', damage).status;
}

export function damageBossPart(
  encounter: BossEncounter,
  partId: BossPartId,
  damage: number,
): { status: BossEncounterStatus; partDestroyed: boolean; coreExposed: boolean } {
  if (encounter.status !== 'active')
    return { status: encounter.status, partDestroyed: false, coreExposed: false };
  const part = encounter.parts[partId];
  if (part.status === 'destroyed' || part.status === 'sealed')
    return { status: encounter.status, partDestroyed: false, coreExposed: false };

  const beforeHp = part.hp;
  part.hp = Math.max(0, part.hp - Math.max(0, damage));
  const partDestroyed = beforeHp > 0 && part.hp === 0;
  let coreExposed = false;

  if (partDestroyed) {
    part.status = 'destroyed';
    if (
      partId !== 'core' &&
      encounter.parts['left-arm'].status === 'destroyed' &&
      encounter.parts['right-arm'].status === 'destroyed' &&
      !encounter.coreExposed
    ) {
      encounter.coreExposed = true;
      encounter.parts.core.status = 'exposed';
      coreExposed = true;
    }
    if (partId === 'core') encounter.status = 'defeated';
  }

  encounter.hp = remainingBossHp(encounter);
  return { status: encounter.status, partDestroyed, coreExposed };
}

export function advanceBossTimer(encounter: BossEncounter, deltaMs: number): BossEncounterStatus {
  if (encounter.status !== 'active') return encounter.status;
  encounter.remainingMs = Math.max(0, encounter.remainingMs - Math.max(0, deltaMs));
  if (encounter.remainingMs === 0) encounter.status = 'retreated';
  return encounter.status;
}

export function advanceBossMotion(
  definition: BossDefinition,
  encounter: BossEncounter,
  deltaMs: number,
): BossMotionMode {
  if (encounter.status !== 'active') return encounter.motionMode;
  encounter.motionElapsedMs += Math.max(0, deltaMs);
  const cyclePosition = encounter.motionElapsedMs % definition.movementCycle.periodMs;
  encounter.motionMode = definition.movementCycle.stopWindows.some(
    (window) => cyclePosition >= window.fromMs && cyclePosition < window.toMs,
  )
    ? 'barrage-stop'
    : 'move';
  return encounter.motionMode;
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
  const partHp = totalBossHp(definition);
  if (definition.hp !== partHp) errors.push('ボスの総耐久力と部位耐久力が一致しません');
  Object.entries(definition.parts).forEach(([partId, part]) => {
    if (part.hp <= 0) errors.push(`ボス部位 ${partId} の耐久力が不正です`);
  });
  if (
    definition.movementCycle.periodMs <= 0 ||
    definition.movementCycle.horizontalAmplitude < 0 ||
    definition.movementCycle.verticalAmplitude < 0 ||
    definition.movementCycle.stopWindows.some(
      (window) =>
        window.fromMs < 0 ||
        window.toMs <= window.fromMs ||
        window.toMs > definition.movementCycle.periodMs,
    )
  )
    errors.push('ボス移動サイクル設定が不正です');
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
