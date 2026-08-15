import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../api/auth.js';

describe('Two-Tier Rate Limiting - IP and Account (SEC-NEW-002 / ADR 0008)', () => {
  let mockStorage = {};

  const mockRedis = {
    incr: vi.fn(async (key) => {
      mockStorage[key] = (mockStorage[key] || 0) + 1;
      return mockStorage[key];
    }),
    expire: vi.fn(async (key, ttl) => true)
  };

  beforeEach(() => {
    mockStorage = {};
    vi.clearAllMocks();
  });

  it('deve permitir requisicoes abaixo do limite de IP (10) e Conta (5)', async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await checkRateLimit(mockRedis, '192.168.1.100', 'danilo@jornada.com', 'login', 10, 5, 900);
      expect(res.allowed).toBe(true);
    }
  });

  it('deve bloquear requisicoes apos 5 tentativas na mesma conta mesmo vindo de IPs diferentes (Ataque Distribuido)', async () => {
    for (let i = 1; i <= 5; i++) {
      const res = await checkRateLimit(mockRedis, `192.168.1.${i}`, 'alvo@jornada.com', 'login', 10, 5, 900);
      expect(res.allowed).toBe(true);
    }

    const resBlocked = await checkRateLimit(mockRedis, '192.168.1.99', 'alvo@jornada.com', 'login', 10, 5, 900);
    expect(resBlocked.allowed).toBe(false);
    expect(resBlocked.reason).toBe('account');
    expect(resBlocked.retryAfter).toBe(900);
  });

  it('deve bloquear requisicoes apos 10 tentativas no mesmo IP com contas diferentes', async () => {
    for (let i = 1; i <= 10; i++) {
      const res = await checkRateLimit(mockRedis, '192.168.1.50', `user${i}@jornada.com`, 'login', 10, 5, 900);
      expect(res.allowed).toBe(true);
    }

    const resBlocked = await checkRateLimit(mockRedis, '192.168.1.50', 'user11@jornada.com', 'login', 10, 5, 900);
    expect(resBlocked.allowed).toBe(false);
    expect(resBlocked.reason).toBe('ip');
  });

  it('deve adotar politica Fail-Open (ADR 0005) em caso de erro no Redis', async () => {
    const brokenRedis = {
      incr: vi.fn(async () => { throw new Error('Redis Timeout'); }),
      expire: vi.fn()
    };

    const res = await checkRateLimit(brokenRedis, '192.168.1.200', 'danilo@jornada.com', 'login', 10, 5, 900);
    expect(res.allowed).toBe(true);
  });
});
