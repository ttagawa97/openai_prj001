import { describe, expect, it } from 'vitest';
import { stages } from './stages';
import {
  advanceBossTimer,
  beginBossEncounter,
  currentBossPhase,
  damageBoss,
  nextBossPattern,
  validateBossDefinition,
} from './boss';

describe('boss encounter', () => {
  const boss = stages[0]!.boss;

  it('validates every stage boss definition', () => {
    stages.forEach((stage) => expect(validateBossDefinition(stage.boss)).toEqual([]));
  });

  it('moves through the stage-one attack phases as hp falls', () => {
    const encounter = beginBossEncounter(boss);
    expect(currentBossPhase(boss, encounter).id).toBe('approach');
    damageBoss(encounter, 10);
    expect(currentBossPhase(boss, encounter).id).toBe('crossfire');
    damageBoss(encounter, 10);
    expect(currentBossPhase(boss, encounter).id).toBe('last-stand');
  });

  it('cycles patterns deterministically within a phase', () => {
    const encounter = beginBossEncounter(boss);
    expect([nextBossPattern(boss, encounter), nextBossPattern(boss, encounter)]).toEqual([
      'aimed',
      'fan-3',
    ]);
  });

  it('resolves defeat and timeout as terminal states', () => {
    const defeated = beginBossEncounter(boss);
    expect(damageBoss(defeated, boss.hp)).toBe('defeated');
    expect(advanceBossTimer(defeated, boss.timeout * 1000)).toBe('defeated');
    const retreated = beginBossEncounter(boss);
    expect(advanceBossTimer(retreated, boss.timeout * 1000)).toBe('retreated');
    expect(damageBoss(retreated, boss.hp)).toBe('retreated');
  });
});
