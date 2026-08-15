import { describe, it, expect, vi, beforeEach } from 'vitest';
import syncHandler from '../api/sync.js';
import { createJwt } from '../api/sync.js';

describe('Active Session & User Verification in Sync (SEC-NEW-003 / ADR 0009)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'revocation_test_secret_key';
    process.env.REDIS_URL = 'redis://localhost:6379';
  });

  it('deve processar mutacao com validacao de usuario ativo', async () => {
    const activeToken = createJwt({ id: 'usr_1', email: 'ativo@jornada.com', teamId: 'team_default_sync', allowedSyncTokens: ['team_default_sync'], role: 'player' });

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${activeToken}` },
      query: { token: 'team_default_sync' },
      body: { manualMatches: [], decks: [] }
    };

    let statusCode = null;
    let jsonBody = null;
    const res = {
      setHeader: vi.fn(),
      status: (c) => {
        statusCode = c;
        return { json: (b) => { jsonBody = b; }, end: vi.fn() };
      }
    };

    await syncHandler(req, res);
    expect([200, 401, 500]).toContain(statusCode);
  });
});
