import { describe, it, expect, vi, beforeEach } from 'vitest';
import authHandler, { signJwt } from '../api/auth.js';

describe('Privacy, Right to be Forgotten & Admin Deletion (PRIV-001 / SPEC-008)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'privacy_test_secret_key';
  });

  it('deve rejeitar tentativa de exclusao administrativa por usuario sem perfil de admin com 403', async () => {
    const playerToken = signJwt({ id: 'usr_1', email: 'player@jornada.com', role: 'player' });

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${playerToken}` },
      body: { action: 'admin_delete_user_data', targetEmail: 'alvo@jornada.com' },
      query: {}
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

    await authHandler(req, res);
    expect(status).toBe(403);
    expect(jsonResult.error).toContain('Operação administrativa restrita');
  });

  it('deve permitir exclusao de dados de usuario quando executada por administrador autenticado', async () => {
    const adminToken = signJwt({ id: 'usr_admin', email: 'admin@jornada.com', role: 'admin' });

    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: { action: 'admin_delete_user_data', targetEmail: 'alvo@jornada.com' },
      query: {}
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

    await authHandler(req, res);
    expect(status).toBe(200);
    expect(jsonResult.success).toBe(true);
  });
});
