import { Networks } from '@stellar/stellar-sdk';

import getHomeDomainConfiguration from './configuration';
import type { StellarNetwork } from '../../types/homeDomain/network';

const checkHorizonNetwork = async (network: StellarNetwork): Promise<void> => {
  const { horizonUrl } = getHomeDomainConfiguration(network);
  const response = await fetch(new URL('/', horizonUrl), { signal: AbortSignal.timeout(10_000) });

  if (!response.ok) {
    throw new Error(`Horizon root request failed: ${response.status}`);
  }

  const body = (await response.json()) as { network_passphrase?: unknown };
  const expected = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

  if (body.network_passphrase !== expected) {
    throw new Error('Horizon network passphrase does not match requested network');
  }
};

export default checkHorizonNetwork;
