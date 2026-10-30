import type { MarketIdentity, PublicMarketIdentity } from '../../types/launch/market';

const toPublicMarketIdentity = (identity: MarketIdentity): PublicMarketIdentity => ({
  ...(identity.chain === 'base' ? { chain: 'base' } : {}),
  network: identity.network,
  contractId: identity.contractId,
});

export default toPublicMarketIdentity;
