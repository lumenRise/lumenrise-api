import { Networks } from '@stellar/stellar-sdk';

import env from '../../../../env';
const getNetworkPassphrase = (): string =>
  env.STELLAR_AUTH_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET;

export { getNetworkPassphrase };
