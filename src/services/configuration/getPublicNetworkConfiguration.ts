import getNetworkConfig from '../network/getNetworkConfig';
import type { StellarNetwork } from '../../types/network/configuration';
import type { PublicNetworkConfiguration } from '../../types/configuration/public';

const getPublicNetworkConfiguration = (network: StellarNetwork): PublicNetworkConfiguration => {
  const configuration = getNetworkConfig(network);

  // Select the fields in the public configuration contract.
  return {
    network: configuration.network,
    rpcUrl: configuration.rpcUrl,
    horizonUrl: configuration.horizonUrl,
    networkPassphrase: configuration.networkPassphrase,
    factoryContractId: configuration.factoryContractId,
    homeDomain: configuration.homeDomain,
    launchConfigured: Boolean(
      configuration.rpcUrl && configuration.factoryContractId && configuration.homeDomain,
    ),
  };
};

export default getPublicNetworkConfiguration;
