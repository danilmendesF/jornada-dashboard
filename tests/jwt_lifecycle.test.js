import { describe, it, expect, beforeEach } from 'vitest';
import { signJwt, verifyJwt } from '../api/auth.js';

describe('JWT Lifecycle & Strict Expiration (SEC-004 / ADR 0006)', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'jwt_lifecycle_test_secret_key_2026';
  });

  it('deve assinar token contendo claim exp por padrao de 30 dias', () => {
    const token = signJwt({ id: 'usr_1', email: 'test@jornada.com' });
    const payload = verifyJwt(token);

    expect(payload).not.toBeNull();
    expect(payload.email).toBe('test@jornada.com');
    expect(payload.iat).toBeTypeOf('number');
    expect(payload.exp).toBeTypeOf('number');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('deve rejeitar token expirado', () => {
    const now = Math.floor(Date.now() / 1000);
    const expiredPayload = { id: 'usr_1', email: 'expired@jornada.com', iat: now - 7200, exp: now - 3600 };
    const expiredToken = signJwt(expiredPayload, -3600);

    expect(verifyJwt(expiredToken)).toBeNull();
  });

  it('deve tolerar diferencas pequenas de relogio (clock skew ate 60s)', () => {
    const now = Math.floor(Date.now() / 1000);
    const recentPayload = { id: 'usr_1', email: 'skew@jornada.com', iat: now - 3600, exp: now - 30 };
    const token = signJwt(recentPayload);

    expect(verifyJwt(token)).not.toBeNull();
  });

  it('deve rejeitar token com algoritmo invalido ou adulterado', () => {
    const validToken = signJwt({ id: 'usr_1' });
    const parts = validToken.split('.');
    const fakeHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const tamperedAlgToken = `${fakeHeader}.${parts[1]}.${parts[2]}`;

    expect(verifyJwt(tamperedAlgToken)).toBeNull();
  });
});
