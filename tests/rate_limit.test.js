import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkRateLimit } from '../api/auth.js';

describe('Distributed Rate Limiting (SEC-003 / ADR 0005)', () => {
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

  it('deve permitir requisicoes abaixo do limite de 10 tentativas', async () => {
    for (let i = 1; i <= 10; i++) {
      const res = await checkRateLimit(mockRedis, '192.168.1.100', 'login', 10, 900);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(10 - i);
    }
  });

  it('deve bloquear requisicoes acima do limite de 10 tentativas com 429 e retryAfter', async () => {
    for (let i = 1; i <= 10; i++) {
      await checkRateLimit(mockRedis, '192.168.1.100', 'login', 10, 900);
    }

    const res = await checkRateLimit(mockRedis, '192.168.1.100', 'login', 10, 900);
    expect(res.allowed).toBe(false);
    expect(res.remaining).toBe(0);
    expect(res.retryAfter).toBe(900);
  });

  it('deve adotar politica Fail-Open (ADR 0005) em caso de erro no Redis', async () => {
    const brokenRedis = {
      incr: vi.fn(async () => { throw new Error('Redis Connection Timeout'); }),
      expire: vi.fn()
    };

    const res = await checkRateLimit(brokenRedis, '192.168.1.200', 'login', 10, 900);
    expect(res.allowed).toBe(true);
  });
});
