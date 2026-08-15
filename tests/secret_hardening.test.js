import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getJwtSecret as getAuthSecret, signJwt as authSign, verifyJwt as authVerify } from '../api/auth.js';
import { getJwtSecret as getSyncSecret, createJwt as syncSign, verifyJwt as syncVerify } from '../api/sync.js';

describe('Security Hardening - Secret Management (GAP-NEW-004)', () => {
  const originalSecret = process.env.JWT_SECRET;

  afterEach(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  it('deve retornar null e rejeitar assinatura/verificação se JWT_SECRET estiver ausente (sem fallback)', () => {
    delete process.env.JWT_SECRET;

    expect(getAuthSecret()).toBeNull();
    expect(getSyncSecret()).toBeNull();

    expect(authSign({ id: 1 })).toBeNull();
    expect(syncSign({ id: 1 })).toBeNull();

    expect(authVerify('some.token.here')).toBeNull();
    expect(syncVerify('some.token.here')).toBeNull();
  });

  it('deve retornar null se JWT_SECRET for apenas espaços em branco', () => {
    process.env.JWT_SECRET = '    ';

    expect(getAuthSecret()).toBeNull();
    expect(getSyncSecret()).toBeNull();
  });

  it('deve funcionar normalmente quando JWT_SECRET for configurado via variável de ambiente', () => {
    process.env.JWT_SECRET = 'super_secret_env_key_2026';

    expect(getAuthSecret()).toBe('super_secret_env_key_2026');
    expect(getSyncSecret()).toBe('super_secret_env_key_2026');

    const token = authSign({ user: 'Danilo' });
    expect(token).toBeTypeOf('string');

    const verified = syncVerify(token);
    expect(verified.user).toBe('Danilo');
  });
});
