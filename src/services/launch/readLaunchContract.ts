import {
  Account,
  BASE_FEE,
  Contract,
  Networks,
  StrKey,
  TransactionBuilder,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk';

import env from '../../env';

const readLaunchContract = async (server: rpc.Server, contractId: string, method: string) => {
  if (!StrKey.isValidEd25519PublicKey(env.STELLAR_READ_ACCOUNT)) {
    throw new Error('STELLAR_READ_ACCOUNT must be configured');
  }

  const transaction = new TransactionBuilder(new Account(env.STELLAR_READ_ACCOUNT, '0'), {
    fee: BASE_FEE,
    networkPassphrase: env.STELLAR_AUTH_NETWORK === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
  })
    .addOperation(new Contract(contractId).call(method))
    .setTimeout(30)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if (
    !rpc.Api.isSimulationSuccess(simulation) ||
    !simulation.result ||
    'restorePreamble' in simulation
  ) {
    throw new Error(`Unable to read ${method}`);
  }

  return {
    value: scValToNative(simulation.result.retval) as unknown,
    ledger: simulation.latestLedger,
  };
};

export default readLaunchContract;
