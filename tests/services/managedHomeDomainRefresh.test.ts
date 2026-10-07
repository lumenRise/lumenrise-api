import { Keypair, Networks } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HomeDomainCheck from '../../src/models/HomeDomainCheck';
import HomeDomainVerification from '../../src/models/HomeDomainVerification';
import fetchStellarToml from '../../src/services/homeDomain/fetchStellarToml';
import verifyIssuerDomain from '../../src/services/homeDomain/verifyIssuerDomain';
import refreshIssuerDomain from '../../src/services/homeDomain/refreshIssuerDomain';

vi.mock('../../src/models/HomeDomainVerification', () => ({ default: { updateOne: vi.fn() } }));
vi.mock('../../src/models/HomeDomainCheck', () => ({ default: { create: vi.fn() } }));
vi.mock('../../src/services/homeDomain/verifyIssuerDomain', () => ({ default: vi.fn() }));
vi.mock('../../src/services/homeDomain/fetchStellarToml', () => ({ default: vi.fn() }));
vi.mock('../../src/env', () => ({ default: { NODE_ENV: 'production' } }));

const issuer = Keypair.random().publicKey();

describe('managed Home Domain publication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyIssuerDomain).mockResolvedValue({
      network: 'testnet',
      issuer,
      claimedDomain: 'testnet.lumenrise.app',
      tomlUrl: 'https://testnet.lumenrise.app/.well-known/stellar.toml',
      status: 'pending',
      reason: 'Awaiting publication',
      checkedAt: new Date(),
      accountLedger: 123,
      publishedAssets: ['TEST'],
    });
  });

  it('marks an issuer verified only after the public managed file lists its exact asset', async () => {
    vi.mocked(fetchStellarToml).mockResolvedValue(
      `NETWORK_PASSPHRASE = "${Networks.TESTNET}"\n[[CURRENCIES]]\ncode = "TEST"\nissuer = "${issuer}"\n`,
    );

    const result = await refreshIssuerDomain('testnet', issuer);

    expect(result.status).toBe('verified');
    expect(HomeDomainVerification.updateOne).toHaveBeenCalledTimes(2);
    expect(HomeDomainCheck.create).toHaveBeenCalledOnce();
  });

  it('keeps publication unavailable when the managed hostname cannot be reached', async () => {
    vi.mocked(fetchStellarToml).mockRejectedValue(new Error('DNS unavailable'));

    const result = await refreshIssuerDomain('testnet', issuer);

    expect(result.status).toBe('unavailable');
    expect(result.reason).toContain('not publicly reachable');
  });
});
