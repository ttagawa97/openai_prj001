export type GameOutcome = 'game_over' | 'game_clear';

export interface SubmitScore {
  score: number;
  reachedStage: number;
  outcome: GameOutcome;
}

export interface ScoreRecord extends SubmitScore {
  id: string;
  recordedAt: string;
}

export interface RankedScore extends Omit<ScoreRecord, 'id'> {
  rank: number;
}
