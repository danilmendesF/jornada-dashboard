import { describe, it, expect, vi } from 'vitest';
import syncHandler, { createJwt, verifyJwt } from '../api/sync.js';

describe('Serverless Security - api/sync.js', () => {
  it('deve gerar e verificar tokens JWT válidos com HMAC-SHA256', () => {
    const payload = { username: 'Danilo', role: 'admin' };
    const token = createJwt(payload);
    expect(token).toBeTypeOf('string');
    
    const verified = verifyJwt(token);
    expect(verified).not.toBeNull();
    expect(verified.username).toBe('Danilo');
    expect(verified.role).toBe('admin');
  });

  it('deve rejeitar tokens JWT adulterados ou inválidos', () => {
    expect(verifyJwt('invalid.token.here')).toBeNull();
    expect(verifyJwt('')).toBeNull();
    expect(verifyJwt(null)).toBeNull();

    const validToken = createJwt({ username: 'Danilo' });
    const tamperedToken = validToken.substring(0, validToken.length - 5) + 'xxxxx';
    expect(verifyJwt(tamperedToken)).toBeNull();
  });

  it('deve rejeitar requisições POST sem cabeçalho Authorization com HTTP 401', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: { manualMatches: [] },
      query: {}
    };

    let statusCalled = null;
    let jsonResult = null;

    const res = {
      setHeader: vi.fn(),
      status: (code) => {
        statusCalled = code;
        return {
          json: (data) => { jsonResult = data; },
          end: vi.fn()
        };
      }
    };

    await syncHandler(req, res);
    expect(statusCalled).toBe(401);
    expect(jsonResult.error).toContain('Autenticação obrigatória');
  });

  it('deve rejeitar requisições POST com token inválido com HTTP 403', async () => {
    const req = {
      method: 'POST',
      headers: { authorization: 'Bearer token_invalido_123' },
      body: { manualMatches: [] },
      query: {}
    };

    let statusCalled = null;
    let jsonResult = null;

    const res = {
      setHeader: vi.fn(),
      status: (code) => {
        statusCalled = code;
        return {
          json: (data) => { jsonResult = data; },
          end: vi.fn()
        };
      }
    };

    await syncHandler(req, res);
    expect(statusCalled).toBe(403);
    expect(jsonResult.error).toContain('Token JWT inválido ou expirado');
  });

  it('deve rejeitar payload com estrutura inválida com HTTP 400', async () => {
    const validToken = createJwt({ username: 'Danilo' });
    const req = {
      method: 'POST',
      headers: { authorization: `Bearer ${validToken}` },
      body: { manualMatches: 'nao_e_array' },
      query: {}
    };

    let statusCalled = null;
    let jsonResult = null;

    const res = {
      setHeader: vi.fn(),
      status: (code) => {
        statusCalled = code;
        return {
          json: (data) => { jsonResult = data; },
          end: vi.fn()
        };
      }
    };

    await syncHandler(req, res);
    expect(statusCalled).toBe(400);
    expect(jsonResult.error).toContain('Estrutura de payload inválida');
  });
});
