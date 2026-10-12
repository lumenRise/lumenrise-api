import { Networks, rpc } from '@stellar/stellar-sdk';

import env from '../../env';

let connection: Promise<rpc.Server> | undefined;
const getLaunchRpc = (): Promise<rpc.Server> => {
  if (!connection) {
    connection = (async () => {
      const server = new rpc.Server(env.STELLAR_RPC_URL, {
        allowHttp:
          env.STELLAR_AUTH_NETWORK === 'testnet' && env.STELLAR_RPC_URL.startsWith('http:'),
        timeout: 15_000,
      });

      const network = await server.getNetwork();

      const expected = env.STELLAR_AUTH_NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

      if (network.passphrase !== expected) {
        throw new Error('Launch RPC network mismatch');
      }

      return server;
    })().catch((error: unknown) => {
      connection = undefined;
      throw error;
    });
  }
  return connection;
};

export default getLaunchRpc;
