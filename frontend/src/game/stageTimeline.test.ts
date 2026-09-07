import { describe, expect, it } from 'vitest';
import { stages } from './stages';
import {
  collectDueEvents,
  findTimelineCursor,
  generateStageTimeline,
  STAGE_SEEDS,
  validateStageTimeline,
} from './stageTimeline';
import { stageOneMapSegments, stageOneWaves } from './stageOne';

describe('generated stage timeline', () => {
  it('generates valid timelines for all stages', () => {
    stages.forEach((stage, index) => {
      const timeline = generateStageTimeline(stage, STAGE_SEEDS[index]!);
      expect(validateStageTimeline(timeline, stage)).toEqual([]);
    });
  });

  it('is deterministic for the same seed and varies positions for another seed', () => {
    const first = generateStageTimeline(stages[0]!, STAGE_SEEDS[0]);
    const repeated = generateStageTimeline(stages[0]!, STAGE_SEEDS[0]);
    const another = generateStageTimeline(stages[0]!, STAGE_SEEDS[0] + 1);
    expect(repeated).toEqual(first);
    expect(another).not.toEqual(first);
  });

  it('introduces advanced enemy roles as stages progress', () => {
    const stageOne = generateStageTimeline(stages[0]!, STAGE_SEEDS[0]);
    const stageTwo = generateStageTimeline(stages[1]!, STAGE_SEEDS[1]);
    const stageThree = generateStageTimeline(stages[2]!, STAGE_SEEDS[2]);
    const archetypes = (timeline: typeof stageOne) =>
      timeline.events.flatMap((event) =>
        event.type === 'enemy_wave' ? event.enemies.map((enemy) => enemy.archetypeId) : [],
      );
    expect(new Set(archetypes(stageOne))).toEqual(new Set(['air-scout', 'ground-tank']));
    expect(archetypes(stageTwo)).toContain('air-interceptor');
    expect(archetypes(stageTwo)).toContain('ground-flak');
    expect(archetypes(stageThree)).toContain('air-gunship');
    expect(archetypes(stageThree)).toContain('ground-turret');
  });

  it('emits ordered due events once and advances its cursor', () => {
    const timeline = generateStageTimeline(stages[0]!, STAGE_SEEDS[0]);
    const firstBatch = collectDueEvents(timeline, 0, 1000);
    expect(firstBatch.events.map((event) => event.eventId)).toEqual([
      'checkpoint-000',
      'stage-1-intro-air',
    ]);
    expect(collectDueEvents(timeline, firstBatch.nextCursor, 1000).events).toEqual([]);
  });

  it('resumes from the checkpoint timestamp instead of replaying earlier events', () => {
    const timeline = generateStageTimeline(stages[0]!, STAGE_SEEDS[0]);
    const cursor = findTimelineCursor(timeline, 12_000);
    const resumed = collectDueEvents(timeline, cursor, 12_000);
    expect(resumed.events.every((event) => event.atMs >= 12_000)).toBe(true);
    expect(resumed.events.some((event) => event.eventId === 'checkpoint-012')).toBe(true);
  });

  it('uses the authored stage-one arc with a midboss and air-ground chain opportunities', () => {
    const timeline = generateStageTimeline(stages[0]!, STAGE_SEEDS[0]);
    expect(timeline.events.filter((event) => event.type === 'midboss_start')).toHaveLength(1);
    expect(new Set(stageOneWaves.map((wave) => wave.section))).toEqual(
      new Set(['introduction', 'development', 'midboss', 'finale']),
    );
    expect(
      stageOneWaves.some(
        (wave) =>
          new Set(
            wave.enemies.map((enemy) => (enemy.archetypeId.startsWith('air-') ? 'air' : 'ground')),
          ).size === 2,
      ),
    ).toBe(true);
  });

  it('covers the full stage-one duration with contiguous map segments', () => {
    expect(stageOneMapSegments[0]?.fromMs).toBe(0);
    expect(stageOneMapSegments.at(-1)?.toMs).toBe(stages[0]!.duration * 1000);
    stageOneMapSegments
      .slice(1)
      .forEach((segment, index) => expect(segment.fromMs).toBe(stageOneMapSegments[index]!.toMs));
  });
});
