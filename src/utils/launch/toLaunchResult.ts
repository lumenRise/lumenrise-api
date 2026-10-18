import toBondingSummary from './toBondingSummary';
import type { LaunchRecord } from '../../types/launch/model';

const toLaunchResult = (launch: LaunchRecord, now = new Date()) => ({
  network: launch.network,
  factoryContractId: launch.factoryContractId,
  factoryIndex: launch.factoryIndex,
  contractId: launch.contractId,
  owner: launch.owner,
  asset: launch.asset,
  pair: launch.pair,
  metadata: launch.metadata,
  config: launch.config,
  state: launch.state,
  asOfLedger: launch.asOfLedger,
  observedAt: launch.observedAt.toISOString(),
  createdAt: launch.createdAt?.toISOString() ?? null,
  creationLedger: launch.creationLedger ?? null,
  creationTransactionHash: launch.creationTransactionHash ?? null,
  stateAsOfLedger: launch.stateAsOfLedger,
  stateObservedAt: launch.stateObservedAt.toISOString(),
  bonding: toBondingSummary(launch, now),
});

export default toLaunchResult;
