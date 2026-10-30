import type { PublicConfiguration } from '../configuration/public';
import type baseApplicationRules from '../../constants/base/applicationRules';

interface BasePublicNetworkConfiguration {
  network: 'testnet' | 'public';
  chainId: 8453 | 84532;
  factoryContractId: string;
  launchConfigured: boolean;
}

interface BasePublicConfiguration extends Omit<PublicConfiguration, 'network' | 'base' | 'rules'> {
  chain: 'base';
  rules: typeof baseApplicationRules;
  network: {
    default: 'testnet';
    header: string;
    supported: readonly ['testnet', 'public'];
    configurations: Record<'testnet' | 'public', BasePublicNetworkConfiguration>;
  };
}

export type { BasePublicConfiguration, BasePublicNetworkConfiguration };
