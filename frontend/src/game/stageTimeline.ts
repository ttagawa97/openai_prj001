import type { TargetClass } from './rules';
import type { StageDefinition } from './stages';
import {
  availableEnemyArchetypes,
  enemyArchetypes,
  selectEnemyArchetype,
  type EnemyArchetypeId,
} from './enemies';

export type MovementPath =
  | { kind: 'linear'; velocityX: number; velocityY: number }
  | { kind: 'sine'; velocityY: number; amplitude: number; periodMs: number };

export interface TimelineEnemy {
  archetypeId: EnemyArchetypeId;
  targetClass: TargetClass;
  spawnX: number;
  spawnY: number;
  movementPath: MovementPath;
}

interface TimelineEventBase {
  eventId: string;
  atMs: number;
}

export type StageTimelineEvent =
  | (TimelineEventBase & { type: 'enemy_wave'; enemies: TimelineEnemy[] })
  | (TimelineEventBase & {
      type: 'checkpoint';
      checkpointId: string;
      progressSeconds: number;
    })
  | (TimelineEventBase & { type: 'boss_warning'; message: string })
  | (TimelineEventBase & { type: 'midboss_start'; name: string; hp: number; score: number })
  | (TimelineEventBase & { type: 'boss_start' });

export interface StageTimeline {
  stageId: number;
  seed: number;
  durationMs: number;
  events: StageTimelineEvent[];
}

export const STAGE_SEEDS = [104729, 209759, 314777, 419789, 524801] as const;

const seededRandom = (seed: number) => {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
};

export function generateStageTimeline(stage: StageDefinition, seed: number): StageTimeline {
  const random = seededRandom(seed);
  const durationMs = stage.duration * 1000;
  const events: StageTimelineEvent[] = stage.checkpoints.map((progressSeconds) => ({
    type: 'checkpoint',
    eventId: `checkpoint-${String(progressSeconds).padStart(3, '0')}`,
    atMs: progressSeconds * 1000,
    checkpointId:
      progressSeconds === 0
        ? `stage-${stage.stageId}-start`
        : progressSeconds === stage.duration
          ? `stage-${stage.stageId}-boss`
          : `stage-${stage.stageId}-cp-${progressSeconds}`,
    progressSeconds,
  }));

  if (stage.stageId === 1) {
    const { stageOneMidboss, stageOneWaves } = awaitStageOneContent();
    stageOneWaves.forEach((wave) =>
      events.push({
        type: 'enemy_wave',
        eventId: `stage-1-${wave.id}`,
        atMs: wave.atMs,
        enemies: wave.enemies.map((enemy) => ({
          ...enemy,
          targetClass: enemyArchetypeTarget(enemy.archetypeId),
          spawnY: -30,
        })),
      }),
    );
    events.push({ type: 'midboss_start', eventId: 'stage-1-midboss', ...stageOneMidboss });
  }

  let atMs = 1000;
  let waveIndex = 0;
  while (stage.stageId !== 1 && atMs < durationMs - 2500) {
    const targetClass: TargetClass = waveIndex % 2 === 0 ? 'air' : 'ground';
    const archetypeId = selectEnemyArchetype(stage.stageId, targetClass, Math.floor(waveIndex / 2));
    const centerX = 70 + Math.round(random() * 400);
    const enemyCount = targetClass === 'air' && waveIndex % 4 === 0 ? 2 : 1;
    const enemies: TimelineEnemy[] = Array.from({ length: enemyCount }, (_, index) => {
      const spawnX = Math.max(35, Math.min(505, centerX + (index * 2 - (enemyCount - 1)) * 34));
      if (targetClass === 'ground') {
        return {
          archetypeId,
          targetClass,
          spawnX,
          spawnY: -30,
          movementPath: {
            kind: 'linear',
            velocityX: Math.round(random() * 30 - 15),
            velocityY: stage.enemySpeed * 0.45,
          },
        };
      }
      return {
        archetypeId,
        targetClass,
        spawnX,
        spawnY: -30 - index * 22,
        movementPath:
          waveIndex % 3 === 0
            ? {
                kind: 'sine',
                velocityY: stage.enemySpeed,
                amplitude: 35 + Math.round(random() * 30),
                periodMs: 1800 + Math.round(random() * 800),
              }
            : {
                kind: 'linear',
                velocityX: Math.round(random() * 70 - 35),
                velocityY: stage.enemySpeed,
              },
      };
    });
    events.push({
      type: 'enemy_wave',
      eventId: `wave-${String(waveIndex + 1).padStart(3, '0')}`,
      atMs,
      enemies,
    });
    waveIndex += 1;
    atMs += stage.enemyInterval;
  }

  events.push({
    type: 'boss_warning',
    eventId: 'stage-boss-warning',
    atMs: durationMs - 2000,
    message: 'WARNING',
  });
  events.push({ type: 'boss_start', eventId: 'stage-boss-start', atMs: durationMs });
  events.sort((left, right) => left.atMs - right.atMs || left.eventId.localeCompare(right.eventId));
  return { stageId: stage.stageId, seed, durationMs, events };
}

import { stageOneMidboss, stageOneWaves } from './stageOne';
const awaitStageOneContent = () => ({ stageOneMidboss, stageOneWaves });
const enemyArchetypeTarget = (id: EnemyArchetypeId): TargetClass => enemyArchetypes[id].targetClass;

export function validateStageTimeline(timeline: StageTimeline, stage: StageDefinition): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  timeline.events.forEach((event, index) => {
    if (ids.has(event.eventId)) errors.push(`eventId ${event.eventId} が重複しています`);
    ids.add(event.eventId);
    if (event.atMs < 0 || event.atMs > timeline.durationMs)
      errors.push(`eventId ${event.eventId} の時刻が不正です`);
    const previous = timeline.events[index - 1];
    if (
      previous &&
      (previous.atMs > event.atMs ||
        (previous.atMs === event.atMs && previous.eventId.localeCompare(event.eventId) > 0))
    )
      errors.push(`eventId ${event.eventId} の並び順が不正です`);
  });
  const bossEvents = timeline.events.filter((event) => event.type === 'boss_start');
  if (bossEvents.length !== 1 || bossEvents[0]?.atMs !== timeline.durationMs)
    errors.push('ボス開始イベントが不正です');
  stage.checkpoints.forEach((checkpoint) => {
    if (
      !timeline.events.some(
        (event) => event.type === 'checkpoint' && event.progressSeconds === checkpoint,
      )
    )
      errors.push(`checkpoint ${checkpoint} が存在しません`);
  });
  timeline.events.forEach((event) => {
    if (event.type !== 'enemy_wave') return;
    event.enemies.forEach((enemy) => {
      const archetype = enemyArchetypes[enemy.archetypeId];
      if (!archetype || archetype.targetClass !== enemy.targetClass)
        errors.push(`enemy archetype ${enemy.archetypeId} の参照が不正です`);
      if (!availableEnemyArchetypes(stage.stageId, enemy.targetClass).includes(enemy.archetypeId))
        errors.push(`stage ${stage.stageId} で ${enemy.archetypeId} は使用できません`);
    });
  });
  return errors;
}

export const findTimelineCursor = (timeline: StageTimeline, startAtMs: number) => {
  const index = timeline.events.findIndex((event) => event.atMs >= startAtMs);
  return index === -1 ? timeline.events.length : index;
};

export function collectDueEvents(
  timeline: StageTimeline,
  cursor: number,
  elapsedMs: number,
): { events: StageTimelineEvent[]; nextCursor: number } {
  let nextCursor = cursor;
  while (nextCursor < timeline.events.length && timeline.events[nextCursor]!.atMs <= elapsedMs)
    nextCursor += 1;
  return { events: timeline.events.slice(cursor, nextCursor), nextCursor };
}
