import getBaseConfiguration from '../base/getBaseConfiguration';
import uniswapDeployments from '../../constants/base/uniswapDeployments';
import type { BasePublicNetworkConfiguration } from '../../types/base/public';

const getPublicBaseNetworkConfiguration = (
  network: 'testnet' | 'public',
): BasePublicNetworkConfiguration => {
  const result: BasePublicNetworkConfiguration = {
    network,
    chainId: network === 'testnet' ? 84532 : 8453,
    factoryContractId: '',
    launchConfigured: false,
    uniswapV4: uniswapDeployments[network],
  };

  try {
    const configuration = getBaseConfiguration(network);

    if (!configuration) {
      return result;
    }

    return {
      ...result,
      factoryContractId: configuration.factoryAddress,
      launchConfigured: true,
    };
  } catch {
    return result;
  }
};

export default getPublicBaseNetworkConfiguration;
