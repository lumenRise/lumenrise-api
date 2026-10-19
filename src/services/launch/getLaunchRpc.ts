import { rpc } from '@stellar/stellar-sdk';

import getNetworkConfig from '../network/getNetworkConfig';
import type { StellarNetwork } from '../../types/network/configuration';

const connections = new Map<StellarNetwork, Promise<rpc.Server>>();

const getLaunchRpc = (network: StellarNetwork): Promise<rpc.Server> => {
  const existing = connections.get(network);

  if (existing) {
    return existing;
  }

  const configuration = getNetworkConfig(network);

  const connection = (async (): Promise<rpc.Server> => {
    const server = new rpc.Server(configuration.rpcUrl, {
      allowHttp: network === 'testnet' && configuration.rpcUrl.startsWith('http:'),
      timeout: 15_000,
    });

    const remote = await server.getNetwork();

    if (remote.passphrase !== configuration.networkPassphrase) {
      throw new Error('Launch RPC network mismatch');
    }

    return server;
  })().catch((error: unknown): never => {
    connections.delete(network);

    throw error;
  });

  connections.set(network, connection);

  return connection;
};

export default getLaunchRpc;
