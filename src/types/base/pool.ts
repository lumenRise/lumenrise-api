import type { Address, Hex } from 'viem';

interface BasePool {
  poolId: Hex;
  poolManager: Address;
  stateView: Address;
  positionManager: Address;
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
  sqrtPriceX96: string;
  tick: number;
  protocolFee: number;
  swapFee: number;
  liquidity: string;
}

export type { BasePool };
