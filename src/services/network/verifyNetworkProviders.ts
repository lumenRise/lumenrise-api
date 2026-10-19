import { rpc } from '@stellar/stellar-sdk';

import getNetworkConfig from './getNetworkConfig';
import type { StellarNetwork } from '../../types/network/configuration';

const verifyNetworkProviders = async (network: StellarNetwork): Promise<void> => {
  const configuration = getNetworkConfig(network);

  const response = await fetch(configuration.horizonUrl, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Unable to verify ${network} Horizon`);
  }

  const horizon = (await response.json()) as { network_passphrase?: unknown };

  if (horizon.network_passphrase !== configuration.networkPassphrase) {
    throw new Error(`Horizon network mismatch for ${network}`);
  }

  if (!configuration.rpcUrl) {
    return;
  }

  const server = new rpc.Server(configuration.rpcUrl, {
    allowHttp: network === 'testnet' && configuration.rpcUrl.startsWith('http:'),
    timeout: 10_000,
  });

  const remote = await server.getNetwork();

  if (remote.passphrase !== configuration.networkPassphrase) {
    throw new Error(`RPC network mismatch for ${network}`);
  }
};

export default verifyNetworkProviders;
