import { describe, expect, it } from 'vitest';
import { stages } from './stages';
import {
  advanceBossMotion,
  advanceBossTimer,
  beginBossEncounter,
  currentBossPhase,
  damageBossPart,
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
    damageBossPart(encounter, 'left-arm', boss.parts['left-arm'].hp);
    expect(currentBossPhase(boss, encounter).id).toBe('approach');
    damageBossPart(encounter, 'right-arm', boss.parts['right-arm'].hp);
    expect(currentBossPhase(boss, encounter).id).toBe('crossfire');
    damageBossPart(encounter, 'core', 5);
    expect(currentBossPhase(boss, encounter).id).toBe('last-stand');
  });

  it('cycles patterns deterministically within a phase', () => {
    const encounter = beginBossEncounter(boss);
    expect([nextBossPattern(boss, encounter), nextBossPattern(boss, encounter)]).toEqual([
      'aimed',
      'fan-3',
    ]);
  });

  it('requires both arms to be destroyed before the core can be damaged', () => {
    const encounter = beginBossEncounter(boss);
    const blocked = damageBossPart(encounter, 'core', 99);
    expect(blocked.status).toBe('active');
    expect(encounter.parts.core.hp).toBe(boss.parts.core.hp);

    expect(damageBossPart(encounter, 'left-arm', boss.parts['left-arm'].hp).partDestroyed).toBe(
      true,
    );
    const rightDestroyed = damageBossPart(encounter, 'right-arm', boss.parts['right-arm'].hp);
    expect(rightDestroyed.coreExposed).toBe(true);
    expect(encounter.parts.core.status).toBe('exposed');
    expect(damageBossPart(encounter, 'core', boss.parts.core.hp).status).toBe('defeated');
  });

  it('resolves defeat and timeout as terminal states', () => {
    const defeated = beginBossEncounter(boss);
    damageBossPart(defeated, 'left-arm', boss.parts['left-arm'].hp);
    damageBossPart(defeated, 'right-arm', boss.parts['right-arm'].hp);
    expect(damageBossPart(defeated, 'core', boss.parts.core.hp).status).toBe('defeated');
    expect(advanceBossTimer(defeated, boss.timeout * 1000)).toBe('defeated');
    const retreated = beginBossEncounter(boss);
    expect(advanceBossTimer(retreated, boss.timeout * 1000)).toBe('retreated');
    expect(damageBossPart(retreated, 'left-arm', boss.parts['left-arm'].hp).status).toBe(
      'retreated',
    );
  });

  it('switches into barrage-stop during configured movement windows', () => {
    const encounter = beginBossEncounter(boss);
    expect(advanceBossMotion(boss, encounter, 1000)).toBe('move');
    expect(advanceBossMotion(boss, encounter, 1400)).toBe('barrage-stop');
    expect(advanceBossMotion(boss, encounter, 1000)).toBe('move');
  });
});
