import type { TargetClass } from './rules';

export const CHAIN_WINDOW_MS = 4000;
export const SYNC_GAUGE_MAX = 100;
export const SYNC_BURST_DURATION_MS = 4000;

export interface CombatState {
  syncGauge: number;
  chainCount: number;
  chainTarget?: TargetClass;
  chainExpiresAt: number;
  scoreMultiplier: number;
  burstEndsAt: number;
}

export const newCombatState = (): CombatState => ({
  syncGauge: 0,
  chainCount: 0,
  chainTarget: undefined,
  chainExpiresAt: 0,
  scoreMultiplier: 1,
  burstEndsAt: 0,
});

export interface DefeatReward {
  score: number;
  alternating: boolean;
}

export function registerDefeat(
  state: CombatState,
  target: TargetClass,
  baseScore: number,
  now: number,
): DefeatReward {
  const chainActive = state.chainTarget !== undefined && now <= state.chainExpiresAt;
  const alternating = chainActive && state.chainTarget !== target;

  state.chainCount = alternating ? state.chainCount + 1 : 1;
  state.chainTarget = target;
  state.chainExpiresAt = now + CHAIN_WINDOW_MS;
  state.scoreMultiplier = Math.min(5, 1 + Math.floor((state.chainCount - 1) / 2));
  state.syncGauge = Math.min(SYNC_GAUGE_MAX, state.syncGauge + (alternating ? 25 : 10));

  return { score: baseScore * state.scoreMultiplier, alternating };
}

export function expireChain(state: CombatState, now: number) {
  if (state.chainTarget === undefined || now <= state.chainExpiresAt) return;
  state.chainCount = 0;
  state.chainTarget = undefined;
  state.scoreMultiplier = 1;
}

export function activateSyncBurst(state: CombatState, now: number): boolean {
  if (state.syncGauge < SYNC_GAUGE_MAX || now < state.burstEndsAt) return false;
  state.syncGauge = 0;
  state.burstEndsAt = now + SYNC_BURST_DURATION_MS;
  return true;
}

export const isSyncBurstActive = (state: CombatState, now: number) => now < state.burstEndsAt;
