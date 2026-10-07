import env from '../../env';
import type { StellarNetwork } from '../../types/homeDomain/network';

const getHomeDomainConfiguration = (network: StellarNetwork) => ({
  horizonUrl: network === 'testnet' ? env.STELLAR_TESTNET_HORIZON_URL : env.STELLAR_PUBLIC_HORIZON_URL,
  managedDomain: network === 'testnet' ? env.STELLAR_TESTNET_HOME_DOMAIN : env.STELLAR_PUBLIC_HOME_DOMAIN,
});

export default getHomeDomainConfiguration;
