import { describe, expect, it } from 'vitest';

import parseDomain from '../../src/services/homeDomain/parseDomain';
import isPublicAddress from '../../src/services/homeDomain/isPublicAddress';
import checkHorizonNetwork from '../../src/services/homeDomain/checkHorizonNetwork';

describe('Home Domain network safety', () => {
  it('rejects local hosts and IP literals as SEP-1 domains', () => {
    expect(parseDomain('localhost')).toBeNull();
    expect(parseDomain('127.0.0.1')).toBeNull();
    expect(parseDomain('metadata.google.internal')).toBeNull();
    expect(parseDomain('Issuer.Example.com')).toBe('issuer.example.com');
  });

  it('rejects private and reserved DNS answers before connecting', () => {
    expect(isPublicAddress('127.0.0.1')).toBe(false);
    expect(isPublicAddress('169.254.169.254')).toBe(false);
    expect(isPublicAddress('100.64.0.1')).toBe(false);
    expect(isPublicAddress('::1')).toBe(false);
    expect(isPublicAddress('8.8.8.8')).toBe(true);
  });

  it('rejects a Horizon endpoint connected to the wrong Stellar network', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      ok: true,
      json: async () => ({ network_passphrase: 'Public Global Stellar Network ; September 2015' }),
    }) as Response;

    try {
      await expect(checkHorizonNetwork('testnet')).rejects.toThrow('does not match requested network');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
