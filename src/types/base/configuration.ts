import type { Address } from 'viem';

interface BaseConfiguration {
  network: 'testnet' | 'public';
  rpcUrl: string;
  factoryAddress: Address;
}

export type { BaseConfiguration };
