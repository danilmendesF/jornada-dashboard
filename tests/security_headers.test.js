import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const vercelConfig = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../vercel.json'), 'utf-8'));

describe('HTTP Security Headers & Hardened CSP (SEC-002 / SEC-NEW-004 / ADR 0010)', () => {
  it('deve conter configuracao de headers de seguranca para todas as rotas no vercel.json', () => {
    const globalHeaderRule = vercelConfig.headers.find(h => h.source === '/(.*)');
    expect(globalHeaderRule).toBeDefined();

    const headersMap = {};
    globalHeaderRule.headers.forEach(h => {
      headersMap[h.key.toLowerCase()] = h.value;
    });

    expect(headersMap['x-content-type-options']).toBe('nosniff');
    expect(headersMap['x-frame-options']).toBe('DENY');
    expect(headersMap['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headersMap['strict-transport-security']).toContain('max-age=31536000');
    expect(headersMap['permissions-policy']).toBeDefined();
  });

  it('deve declarar Content-Security-Policy com separacao de script-src-elem e script-src-attr', () => {
    const globalHeaderRule = vercelConfig.headers.find(h => h.source === '/(.*)');
    const cspHeader = globalHeaderRule.headers.find(h => h.key.toLowerCase() === 'content-security-policy');

    expect(cspHeader).toBeDefined();
    const cspValue = cspHeader.value;

    expect(cspValue).toContain("default-src 'self'");
    expect(cspValue).toContain("script-src-elem 'self' https://cdn.jsdelivr.net");
    expect(cspValue).toContain("script-src-attr 'unsafe-inline'");
    expect(cspValue).toContain("frame-ancestors 'none'");
    expect(cspValue).toContain("object-src 'none'");
    expect(cspValue).toContain('https://fonts.googleapis.com');
    expect(cspValue).toContain("connect-src 'self' https://www.jornadatcgteam.com.br https://cdn.jsdelivr.net");
  });
});
