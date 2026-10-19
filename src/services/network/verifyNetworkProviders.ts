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

  await response.json();

  if (!configuration.rpcUrl) {
    return;
  }

  const server = new rpc.Server(configuration.rpcUrl, {
    allowHttp: network === 'testnet' && configuration.rpcUrl.startsWith('http:'),
    timeout: 10_000,
  });

  await server.getNetwork();
};

export default verifyNetworkProviders;
