import { parse } from 'smol-toml';
import { Keypair, Networks } from '@stellar/stellar-sdk';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Launch from '../src/models/Launch';
import TokenImage from '../src/models/TokenImage';
import AssetIdentity from '../src/models/AssetIdentity';
import serveStellarToml from './helpers/serveStellarToml';

vi.mock('../src/models/AssetIdentity', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/models/Launch', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/models/TokenImage', () => ({ default: { find: vi.fn() } }));
vi.mock('../src/env', () => ({ default: {
  NODE_ENV: 'test',
  LOG_LEVEL: 'silent',
  CLIENT_ORIGIN: 'http://localhost:5173',
  STELLAR_TESTNET_HOME_DOMAIN: 'testnet.lumenrise.app',
  STELLAR_PUBLIC_HOME_DOMAIN: 'lumenrise.app',
} }));

const issuer = Keypair.random().publicKey();
const secondIssuer = Keypair.random().publicKey();
const launch = {
  contractId: 'CLAUNCH',
  asset: 'CTEST',
  metadata: {
    symbol: 'TEST',
    name: 'Test Token',
    description: 'An indexed launch',
    logo: 'https://images.lumenrise.app/tokens/test.png',
  },
};

const mockLaunches = (items: typeof launch[]) => {
  vi.mocked(Launch.find).mockReturnValue({
    sort: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(items) }),
    }),
  } as never);
};

describe('managed stellar.toml', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLaunches([launch]);
    vi.mocked(TokenImage.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([
      { launchContractId: 'CLAUNCH', assetContractId: 'CTEST', publicUrl: 'https://images.lumenrise.app/tokens/test.png' },
      { launchContractId: 'CSECONDLAUNCH', assetContractId: 'CSECOND', publicUrl: 'https://images.lumenrise.app/tokens/second.png' },
    ]) } as never);
    vi.mocked(AssetIdentity.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([
      { assetContractId: 'CTEST', assetCode: 'TEST', issuer, status: 'verified' },
      { assetContractId: 'CSECOND', assetCode: 'SECOND', issuer: secondIssuer, status: 'verified' },
      { assetContractId: 'CMISMATCH', assetCode: 'OTHER', issuer, status: 'verified' },
    ]) } as never);
  });

  it('serves each verified issued asset once with its database metadata', async () => {
    mockLaunches([
      launch,
      launch,
      {
        contractId: 'CSECONDLAUNCH',
        asset: 'CSECOND',
        metadata: {
          symbol: 'SECOND',
          name: 'Second Token',
          description: 'Another confirmed factory launch',
          logo: 'https://images.lumenrise.app/tokens/second.png',
        },
      },
      {
        contractId: 'CCUSTOMLAUNCH',
        asset: 'CCUSTOM',
        metadata: {
          symbol: 'CUSTOM',
          name: 'Custom Token',
          description: 'Another indexed launch',
          logo: 'https://images.lumenrise.app/tokens/custom.png',
        },
      },
      {
        contractId: 'CMISMATCHLAUNCH',
        asset: 'CMISMATCH',
        metadata: {
          symbol: 'MISMATCH',
          name: 'Wrong metadata',
          description: 'Symbol does not match the asset',
          logo: 'https://images.lumenrise.app/tokens/mismatch.png',
        },
      },
    ]);

    const response = await serveStellarToml('testnet.lumenrise.app');
    const toml = parse(response.text);

    expect(response.status).toBe(200);
    expect(response.set).toHaveBeenCalledWith('Content-Type', 'text/plain; charset=utf-8');
    expect(toml.NETWORK_PASSPHRASE).toBe(Networks.TESTNET);
    expect(toml.DOCUMENTATION).toEqual({ ORG_NAME: 'Lumenrise', ORG_URL: 'https://testnet.lumenrise.app' });
    expect(toml.CURRENCIES).toEqual([
      {
        code: 'TEST', issuer, name: 'Test Token', desc: 'An indexed launch',
        display_decimals: 7, is_asset_anchored: false,
        image: 'https://images.lumenrise.app/tokens/test.png',
      },
      {
        code: 'SECOND', issuer: secondIssuer, name: 'Second Token', desc: 'Another confirmed factory launch',
        display_decimals: 7, is_asset_anchored: false,
        image: 'https://images.lumenrise.app/tokens/second.png',
      },
    ]);
    expect(response.text).not.toMatch(/contract|approval_server|approval_criteria|conditions/);
    expect(Launch.find).toHaveBeenCalledWith({ network: 'testnet' });
    expect(TokenImage.find).toHaveBeenCalledWith({ network: 'testnet', status: 'finalized', assetContractId: { $in: ['CTEST', 'CTEST', 'CSECOND', 'CCUSTOM', 'CMISMATCH'] } });
  });

  it('serves public-network launches only on the configured public host', async () => {
    const response = await serveStellarToml('lumenrise.app');

    expect(response.status).toBe(200);
    expect(parse(response.text).NETWORK_PASSPHRASE).toBe(Networks.PUBLIC);
    expect(Launch.find).toHaveBeenCalledWith({ network: 'public' });
  });

  it('does not publish an unlinked on-chain logo as the managed token image', async () => {
    vi.mocked(TokenImage.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);

    const response = await serveStellarToml('testnet.lumenrise.app');
    expect(parse(response.text).CURRENCIES).toEqual([{
      code: 'TEST', issuer, name: 'Test Token', desc: 'An indexed launch',
      display_decimals: 7, is_asset_anchored: false,
    }]);
  });

  it('rejects hosts outside the two configured domains', async () => {
    const response = await serveStellarToml('other.example.org');

    expect(response.status).toBe(404);
    expect(Launch.find).not.toHaveBeenCalled();
  });
});
