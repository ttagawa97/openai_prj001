import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const apps: ReturnType<typeof buildApp>[] = [];
afterEach(async () => Promise.all(apps.splice(0).map((app) => app.close())));

describe('score API', () => {
  it('reports health', async () => {
    const app = buildApp();
    apps.push(app);
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('registers and ranks scores with earlier ties first', async () => {
    const app = buildApp();
    apps.push(app);
    for (const score of [100, 250, 250]) {
      const response = await app.inject({
        method: 'POST',
        url: '/api/scores',
        payload: { score, reachedStage: 2, outcome: 'game_over' },
      });
      expect(response.statusCode).toBe(201);
    }
    const scores = (await app.inject({ method: 'GET', url: '/api/scores?limit=2' })).json().scores;
    expect(
      scores.map((entry: { rank: number; score: number }) => [entry.rank, entry.score]),
    ).toEqual([
      [1, 250],
      [2, 250],
    ]);
  });

  it('rejects invalid and unknown requests safely', async () => {
    const app = buildApp();
    apps.push(app);
    const invalid = await app.inject({
      method: 'POST',
      url: '/api/scores',
      payload: { score: -1, reachedStage: 9, outcome: 'win' },
    });
    expect(invalid.statusCode).toBe(400);
    expect(invalid.json().error.code).toBe('VALIDATION_ERROR');
    expect((await app.inject({ method: 'GET', url: '/missing' })).json().error.code).toBe(
      'NOT_FOUND',
    );
  });

  it('starts with an empty in-memory ranking after recreation', async () => {
    const first = buildApp();
    apps.push(first);
    await first.inject({
      method: 'POST',
      url: '/api/scores',
      payload: { score: 10, reachedStage: 1, outcome: 'game_over' },
    });
    const restarted = buildApp();
    apps.push(restarted);
    expect((await restarted.inject({ method: 'GET', url: '/api/scores' })).json()).toEqual({
      scores: [],
    });
  });
});
