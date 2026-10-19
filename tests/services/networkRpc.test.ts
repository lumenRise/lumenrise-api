import { Networks } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import type * as StellarSdk from '@stellar/stellar-sdk';

import getLaunchRpc from '../../src/services/launch/getLaunchRpc';

const servers = vi.hoisted(() => ({ count: 0 }));

vi.mock('../../src/services/network/getNetworkConfig', () => ({
  default: (network: string) => ({
    rpcUrl: `https://${network}.example`,
    networkPassphrase: network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
  }),
}));

vi.mock('@stellar/stellar-sdk', async (load) => {
  const sdk = await load<typeof StellarSdk>();

  return {
    ...sdk,
    rpc: {
      Server: class {
        url: string;

        constructor(url: string) {
          this.url = url;
          servers.count += 1;
        }

        getNetwork = async (): Promise<{ passphrase: string }> => ({
          passphrase: this.url.includes('testnet') ? sdk.Networks.TESTNET : sdk.Networks.PUBLIC,
        });
      },
    },
  };
});

describe('RPC connection isolation', () => {
  it('caches connections per network under concurrent requests', async () => {
    const [testnet, publicNetwork, repeatedTestnet, repeatedPublic] = await Promise.all([
      getLaunchRpc('testnet'),
      getLaunchRpc('public'),
      getLaunchRpc('testnet'),
      getLaunchRpc('public'),
    ]);

    expect(testnet).toBe(repeatedTestnet);
    expect(publicNetwork).toBe(repeatedPublic);
    expect(testnet).not.toBe(publicNetwork);
    expect(servers.count).toBe(2);
  });
});
