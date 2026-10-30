import type { PipelineStage } from 'mongoose';

import volumeAmountLimb from './volumeAmountLimb';
import volumeAmountString from './volumeAmountString';

const buildLaunchVolumePipeline = (
  now: Date,
): (PipelineStage.Match | PipelineStage.Group | PipelineStage.Project)[] => {
  const since = new Date(now.getTime() - 86_400_000);
  const recent = { $gte: ['$tradedAt', since] };
  const buy = { $eq: ['$side', 'buy'] };

  // Split uint128 strings before conversion so Decimal128 cannot round their low digits.
  return [
    { $match: { tradedAt: { $lte: now } } },
    {
      $group: {
        _id: null,
        tradeCount: { $sum: { $cond: [recent, 1, 0] } },
        buyCount: { $sum: { $cond: [{ $and: [recent, buy] }, 1, 0] } },
        grossHigh: { $sum: { $cond: [recent, volumeAmountLimb('$grossAmount', 'high'), 0] } },
        grossLow: { $sum: { $cond: [recent, volumeAmountLimb('$grossAmount', 'low'), 0] } },
        assetHigh: { $sum: { $cond: [recent, volumeAmountLimb('$assetAmount', 'high'), 0] } },
        assetLow: { $sum: { $cond: [recent, volumeAmountLimb('$assetAmount', 'low'), 0] } },
        totalTradeCount: { $sum: 1 },
        totalBuyCount: { $sum: { $cond: [buy, 1, 0] } },
        totalGrossHigh: { $sum: volumeAmountLimb('$grossAmount', 'high') },
        totalGrossLow: { $sum: volumeAmountLimb('$grossAmount', 'low') },
        totalAssetHigh: { $sum: volumeAmountLimb('$assetAmount', 'high') },
        totalAssetLow: { $sum: volumeAmountLimb('$assetAmount', 'low') },
      },
    },
    {
      $project: {
        _id: 0,
        volume24h: {
          tradeCount: '$tradeCount',
          buyCount: '$buyCount',
          sellCount: { $subtract: ['$tradeCount', '$buyCount'] },
          grossPairAmount: volumeAmountString('$grossHigh', '$grossLow'),
          assetAmount: volumeAmountString('$assetHigh', '$assetLow'),
        },
        volumeTotal: {
          tradeCount: '$totalTradeCount',
          buyCount: '$totalBuyCount',
          sellCount: { $subtract: ['$totalTradeCount', '$totalBuyCount'] },
          grossPairAmount: volumeAmountString('$totalGrossHigh', '$totalGrossLow'),
          assetAmount: volumeAmountString('$totalAssetHigh', '$totalAssetLow'),
        },
      },
    },
  ];
};

export default buildLaunchVolumePipeline;
