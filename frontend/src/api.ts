import type { RankedScore, SubmitScore } from '@skyline/shared';

export async function submitScore(payload: SubmitScore): Promise<void> {
  const response = await fetch('/api/scores', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error('スコア登録に失敗しました');
}
export async function getRanking(): Promise<RankedScore[]> {
  const response = await fetch('/api/scores?limit=10');
  if (!response.ok) throw new Error('ランキング取得に失敗しました');
  return ((await response.json()) as { scores: RankedScore[] }).scores;
}
