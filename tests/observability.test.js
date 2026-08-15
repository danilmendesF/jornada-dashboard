import { describe, it, expect } from 'vitest';
import { getRequestId } from '../api/auth.js';

describe('Observability & Correlation-ID (OBS-001 / ADR 0006)', () => {
  it('deve reutilizar x-request-id valido enviado pelo cliente', () => {
    const req = {
      headers: {
        'x-request-id': 'req-custom-client-id-12345678'
      }
    };

    const reqId = getRequestId(req);
    expect(reqId).toBe('req-custom-client-id-12345678');
  });

  it('deve gerar UUIDv4 quando o header nao for enviado', () => {
    const req = { headers: {} };
    const reqId = getRequestId(req);

    expect(reqId).toBeTypeOf('string');
    expect(reqId.length).toBeGreaterThan(20);
  });

  it('deve sanitizar e rejeitar IDs maliciosos com caracteres invalidos gerando novo UUID', () => {
    const req = {
      headers: {
        'x-request-id': '<script>alert(1)</script>'
      }
    };

    const reqId = getRequestId(req);
    expect(reqId).not.toContain('<script>');
    expect(reqId.length).toBeGreaterThan(20);
  });
});
