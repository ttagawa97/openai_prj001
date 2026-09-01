import { describe, expect, it } from 'vitest';
import { applyPlayerDestroyed, newSession, resolveBoss } from './state';
import { activeAttacks, canDamage, clampPlayer, groundTargetPosition } from './rules';
import { stages, validateStages } from './stages';

describe('game rules', () => {
  it('separates air and ground targets', () => {
    expect(canDamage('air', 'air')).toBe(true);
    expect(canDamage('air', 'ground')).toBe(false);
    expect(canDamage('ground', 'ground')).toBe(true);
    expect(canDamage('ground', 'air')).toBe(false);
  });
  it('activates air and ground attacks independently on simultaneous input', () => {
    expect(activeAttacks(true, true)).toEqual(['air', 'ground']);
    expect(activeAttacks(true, false)).toEqual(['air']);
    expect(activeAttacks(false, true)).toEqual(['ground']);
  });
  it('keeps player in the playfield', () =>
    expect(clampPlayer(-1, 1000)).toEqual({ x: 22, y: 930 }));
  it('places the ground crosshair ahead of the player without clipping the top edge', () => {
    expect(groundTargetPosition(270, 800)).toEqual({ x: 270, y: 590 });
    expect(groundTargetPosition(100, 120)).toEqual({ x: 100, y: 100 });
  });
  it('retains score/stage while respawning and ends on final life', () => {
    const session = newSession();
    session.score = 900;
    session.currentStage = 3;
    session.checkpointId = 'stage-3-cp-1';
    expect(applyPlayerDestroyed(session)).toBe('respawn');
    expect(session.score).toBe(900);
    expect(session.currentStage).toBe(3);
    applyPlayerDestroyed(session);
    expect(applyPlayerDestroyed(session)).toBe('game_over');
  });
  it('handles boss defeat, retreat, and stage five completion', () => {
    const session = newSession();
    expect(resolveBoss(session, false)).toBe('next_stage');
    expect(session.currentStage).toBe(2);
    session.currentStage = 5;
    expect(resolveBoss(session, true)).toBe('game_clear');
  });
  it('validates all static stages', () => expect(validateStages(stages)).toEqual([]));
});
