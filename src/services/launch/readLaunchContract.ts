import type { xdr } from '@stellar/stellar-sdk';
import {
  Account,
  BASE_FEE,
  Contract,
  contract,
  TransactionBuilder,
  rpc,
  scValToNative,
} from '@stellar/stellar-sdk';

import getNetworkConfig from '../network/getNetworkConfig';
import type { StellarNetwork } from '../../types/network/configuration';

const readLaunchContract = async (
  server: rpc.Server,
  contractId: string,
  method: string,
  network: StellarNetwork,
  args: xdr.ScVal[] = [],
): Promise<{ value: unknown; ledger: number }> => {
  const configuration = getNetworkConfig(network);

  const transaction = new TransactionBuilder(new Account(contract.NULL_ACCOUNT, '0'), {
    fee: BASE_FEE,
    networkPassphrase: configuration.networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
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
