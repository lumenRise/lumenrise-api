import type { TradeRecord } from '../../types/launch/market';

const toTradeResult = (trade: TradeRecord, asset: string) => ({
  trader: trade.trader,
  tradedAt: trade.tradedAt.toISOString(),
  asset,
  side: trade.side,
  assetAmount: trade.assetAmount,
  executionPrice: trade.executionPrice,
});

export default toTradeResult;
