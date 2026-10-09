import { Keypair } from '@stellar/stellar-sdk';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import AssetIdentity from '../src/models/AssetIdentity';
import HomeDomainVerification from '../src/models/HomeDomainVerification';
import getManagedStellarTomlRoute from '../src/routes/managedStellarToml';
import fetchStellarToml from '../src/services/homeDomain/fetchStellarToml';
import verifyIssuerDomain from '../src/services/homeDomain/verifyIssuerDomain';

vi.mock('../src/models/AssetIdentity', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/models/Launch', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/models/HomeDomainVerification', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/services/homeDomain/fetchStellarToml', () => ({ default: vi.fn() }));
vi.mock('../src/services/homeDomain/checkHorizonNetwork', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../src/services/homeDomain/configuration', () => ({
  default: () => ({ horizonUrl: 'https://horizon-testnet.stellar.org', managedDomain: 'testnet.lumenrise.app' }),
}));
vi.mock('../src/env', () => ({ default: {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  STELLAR_TESTNET_HOME_DOMAIN: 'testnet.lumenrise.app',
  STELLAR_PUBLIC_HOME_DOMAIN: 'lumenrise.app',
} }));

const issuer = Keypair.random().publicKey();

describe('Home Domain verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(AssetIdentity.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([
      { network: 'testnet', assetContractId: 'CTEST', assetCode: 'TEST', issuer, status: 'verified' },
    ]) } as never);
    vi.mocked(Launch.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([
          { asset: 'CTEST', metadata: { logo: 'https://images.lumenrise.app/tokens/test.png' } },
        ]) }),
      }),
    } as never);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('requires the exact issuer and asset code in an external stellar.toml', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ account_id: issuer, home_domain: 'issuer.example.com', last_modified_ledger: 42 }),
    }));
    vi.mocked(fetchStellarToml).mockResolvedValue('[[CURRENCIES]]\ncode = "OTHER"\nissuer = "' + issuer + '"\n');

    const mismatch = await verifyIssuerDomain('testnet', issuer);
    expect(mismatch.status).toBe('mismatch');

    vi.mocked(fetchStellarToml).mockResolvedValue('[[CURRENCIES]]\ncode = "TEST"\nissuer = "' + issuer + '"\n');

    const verified = await verifyIssuerDomain('testnet', issuer);
    expect(verified.status).toBe('verified');
    expect(verified.publishedAssets).toEqual(['TEST']);
  });

  it('publishes only recently verified assets on the configured managed host', async () => {
    vi.mocked(HomeDomainVerification.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([
      { issuer, claimedDomain: 'testnet.lumenrise.app', publishedAssets: ['TEST'], checkedAt: new Date() },
    ]) } as never);
    const response = {
      status: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    await getManagedStellarTomlRoute(
      { get: () => 'testnet.lumenrise.app' } as unknown as Request,
      response as unknown as Response,
      vi.fn(),
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.send).toHaveBeenCalledWith(expect.stringContaining('[[CURRENCIES]]'));
    expect(response.send).toHaveBeenCalledWith(expect.stringContaining(`issuer = "${issuer}"`));
    expect(response.send).toHaveBeenCalledWith(expect.stringContaining('image = "https://images.lumenrise.app/tokens/test.png"'));
    expect(Launch.find).toHaveBeenCalledWith({ network: 'testnet', asset: { $in: ['CTEST'] } });
  });
});
