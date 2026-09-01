import cors from '@fastify/cors';
import Fastify, { type FastifyError } from 'fastify';
import type { RankedScore, ScoreRecord, SubmitScore } from '@skyline/shared';

interface StoredScore extends ScoreRecord {
  sequence: number;
}

export function buildApp() {
  const app = Fastify({ logger: process.env.NODE_ENV !== 'test' });
  const scores: StoredScore[] = [];
  let sequence = 0;

  app.register(cors, {
    origin: (origin, callback) => {
      const allowed = !origin || /^http:\/\/(127\.0\.0\.1|localhost):5173$/.test(origin);
      callback(allowed ? null : new Error('Origin not allowed'), allowed);
    },
  });

  app.get(
    '/api/health',
    {
      schema: { response: { 200: { type: 'object', properties: { status: { type: 'string' } } } } },
    },
    async () => ({ status: 'ok' }),
  );

  app.post<{ Body: SubmitScore }>(
    '/api/scores',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'reachedStage', 'outcome'],
          properties: {
            score: { type: 'integer', minimum: 0, maximum: 2147483647 },
            reachedStage: { type: 'integer', minimum: 1, maximum: 5 },
            outcome: { type: 'string', enum: ['game_over', 'game_clear'] },
          },
        },
        response: {
          201: {
            type: 'object',
            required: ['id', 'score', 'reachedStage', 'outcome', 'recordedAt'],
            properties: {
              id: { type: 'string' },
              score: { type: 'integer' },
              reachedStage: { type: 'integer' },
              outcome: { type: 'string' },
              recordedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const record: StoredScore = {
        id: crypto.randomUUID(),
        ...request.body,
        recordedAt: new Date().toISOString(),
        sequence: ++sequence,
      };
      scores.push(record);
      const response: ScoreRecord = {
        id: record.id,
        score: record.score,
        reachedStage: record.reachedStage,
        outcome: record.outcome,
        recordedAt: record.recordedAt,
      };
      return reply.code(201).send(response);
    },
  );

  app.get<{ Querystring: { limit?: number } }>(
    '/api/scores',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: { limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
        },
      },
    },
    async (request) => {
      const ranked: RankedScore[] = [...scores]
        .sort((a, b) => b.score - a.score || a.sequence - b.sequence)
        .slice(0, request.query.limit ?? 10)
        .map(({ score, reachedStage, outcome, recordedAt }, index) => ({
          rank: index + 1,
          score,
          reachedStage,
          outcome,
          recordedAt,
        }));
      return { scores: ranked };
    },
  );

  app.setNotFoundHandler((_request, reply) =>
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Route not found' } }),
  );
  app.setErrorHandler((error: FastifyError, _request, reply) => {
    if (error.validation)
      return reply
        .code(400)
        .send({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request' } });
    app.log.error(error);
    return reply
      .code(500)
      .send({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });
  return app;
}
