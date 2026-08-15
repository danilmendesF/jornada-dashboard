import { describe, it, expect, vi, beforeEach } from 'vitest';
import syncHandler, { createJwt } from '../api/sync.js';

describe('Authorization & Resource Access Control (GAP-NEW-002)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'authz_test_secret_key';
  });

  it('deve permitir mutação no namespace default do time para membros autenticados', async () => {
    const token = createJwt({ name: 'Danilo', teamId: 'team_default_sync' });
    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      query: { token: 'team_default_sync' },
      body: { manualMatches: [] }
    };

    let status = null;
    const res = {
      setHeader: vi.fn(),
      status: (c) => { status = c; return { json: vi.fn(), end: vi.fn() }; }
    };

    await syncHandler(req, res);
    expect(status).not.toBe(403);
  });

  it('deve BLOQUEAR (403 Forbidden) mutação em namespace estrangeiro que não pertença ao usuário', async () => {
    const token = createJwt({
      name: 'Danilo',
      teamId: 'team_jornada_alpha',
      allowedSyncTokens: ['team_jornada_alpha']
    });

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      query: { token: 'team_outro_time_estrangeiro_beta' },
      body: { manualMatches: [] }
    };

    let status = null;
    let jsonResult = null;
    const res = {
      setHeader: vi.fn(),
      status: (c) => {
        status = c;
        return { json: (d) => { jsonResult = d; }, end: vi.fn() };
      }
    };

    await syncHandler(req, res);
    expect(status).toBe(403);
    expect(jsonResult.error).toContain('você não tem autorização para modificar este time/namespace');
  });

  it('deve permitir admin mutar qualquer namespace', async () => {
    const adminToken = createJwt({
      name: 'AdminUser',
      role: 'admin',
      teamId: 'team_jornada_alpha'
    });

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      query: { token: 'team_qualquer_outro_time' },
      body: { manualMatches: [] }
    };

    let status = null;
    const res = {
      setHeader: vi.fn(),
      status: (c) => { status = c; return { json: vi.fn(), end: vi.fn() }; }
    };

    await syncHandler(req, res);
    expect(status).not.toBe(403);
  });
});
