import type { PublicConfiguration } from '../configuration/public';

interface BasePublicConfiguration extends Omit<PublicConfiguration, 'network'> {
  chain: 'base';
  network: {
    default: 'testnet';
    header: string;
    supported: readonly ['testnet', 'public'];
    configurations: Record<
      'testnet' | 'public',
      {
        network: 'testnet' | 'public';
        chainId: 8453 | 84532;
        factoryContractId: string;
        launchConfigured: boolean;
      }
    >;
  };
}

export type { BasePublicConfiguration };
