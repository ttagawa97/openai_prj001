import { describe, expect, it } from 'vitest';
import {
  activateSyncBurst,
  expireChain,
  isSyncBurstActive,
  newCombatState,
  registerDefeat,
} from './combat';

describe('air-ground combat chain', () => {
  it('builds multiplier and gauge by alternating target classes', () => {
    const state = newCombatState();
    expect(registerDefeat(state, 'air', 200, 0)).toEqual({ score: 200, alternating: false });
    expect(registerDefeat(state, 'ground', 350, 1000)).toEqual({
      score: 350,
      alternating: true,
    });
    expect(registerDefeat(state, 'air', 200, 2000)).toEqual({ score: 400, alternating: true });
    expect(state).toMatchObject({ chainCount: 3, scoreMultiplier: 2, syncGauge: 60 });
  });

  it('restarts the chain on the same class or after the chain window', () => {
    const state = newCombatState();
    registerDefeat(state, 'air', 200, 0);
    registerDefeat(state, 'air', 200, 1000);
    expect(state).toMatchObject({ chainCount: 1, scoreMultiplier: 1, syncGauge: 20 });
    expireChain(state, 5001);
    expect(state).toMatchObject({ chainCount: 0, scoreMultiplier: 1, chainTarget: undefined });
  });

  it('caps the multiplier at five and the sync gauge at 100', () => {
    const state = newCombatState();
    for (let index = 0; index < 12; index += 1)
      registerDefeat(state, index % 2 === 0 ? 'air' : 'ground', 100, index * 100);
    expect(state.scoreMultiplier).toBe(5);
    expect(state.syncGauge).toBe(100);
  });

  it('consumes a full gauge for a four-second sync burst', () => {
    const state = newCombatState();
    state.syncGauge = 99;
    expect(activateSyncBurst(state, 1000)).toBe(false);
    state.syncGauge = 100;
    expect(activateSyncBurst(state, 1000)).toBe(true);
    expect(state.syncGauge).toBe(0);
    expect(isSyncBurstActive(state, 4999)).toBe(true);
    expect(isSyncBurstActive(state, 5000)).toBe(false);
  });
});
