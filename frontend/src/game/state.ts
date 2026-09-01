import type { GameOutcome } from '@skyline/shared';

export interface GameSession {
  score: number;
  lives: number;
  currentStage: number;
  checkpointId: string;
  checkpointProgress: number;
  playerState: 'playing' | 'respawning' | 'game_over' | 'game_clear';
  bossState: 'none' | 'active' | 'defeated' | 'retreated';
}

export const newSession = (): GameSession => ({
  score: 0,
  lives: 3,
  currentStage: 1,
  checkpointId: 'stage-1-start',
  checkpointProgress: 0,
  playerState: 'playing',
  bossState: 'none',
});

export function applyPlayerDestroyed(session: GameSession): 'respawn' | 'game_over' {
  session.lives -= 1;
  if (session.lives <= 0) {
    session.playerState = 'game_over';
    return 'game_over';
  }
  session.playerState = 'respawning';
  return 'respawn';
}

export function resolveBoss(session: GameSession, defeated: boolean): GameOutcome | 'next_stage' {
  session.bossState = defeated ? 'defeated' : 'retreated';
  if (session.currentStage === 5) {
    session.playerState = 'game_clear';
    return 'game_clear';
  }
  session.currentStage += 1;
  session.checkpointId = `stage-${session.currentStage}-start`;
  session.checkpointProgress = 0;
  session.bossState = 'none';
  return 'next_stage';
}
