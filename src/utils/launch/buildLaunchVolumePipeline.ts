import type { PipelineStage } from 'mongoose';

const buildLaunchVolumePipeline = (
  now: Date,
): (PipelineStage.Match | PipelineStage.Group | PipelineStage.Project)[] => {
  const since = new Date(now.getTime() - 86_400_000);
  const recent = { $gte: ['$tradedAt', since] };
  const buy = { $eq: ['$side', 'buy'] };

  return [
    { $match: { tradedAt: { $lte: now } } },
    {
      $group: {
        _id: null,
        tradeCount: { $sum: { $cond: [recent, 1, 0] } },
        buyCount: { $sum: { $cond: [{ $and: [recent, buy] }, 1, 0] } },
        grossAmount: { $sum: { $cond: [recent, { $toDecimal: '$grossAmount' }, 0] } },
        assetAmount: { $sum: { $cond: [recent, { $toDecimal: '$assetAmount' }, 0] } },
        totalTradeCount: { $sum: 1 },
        totalBuyCount: { $sum: { $cond: [buy, 1, 0] } },
        totalGrossAmount: { $sum: { $toDecimal: '$grossAmount' } },
        totalAssetAmount: { $sum: { $toDecimal: '$assetAmount' } },
      },
    },
    {
      $project: {
        _id: 0,
        volume24h: {
          tradeCount: '$tradeCount',
          buyCount: '$buyCount',
          sellCount: { $subtract: ['$tradeCount', '$buyCount'] },
          grossPairAmount: { $toString: '$grossAmount' },
          assetAmount: { $toString: '$assetAmount' },
        },
        volumeTotal: {
          tradeCount: '$totalTradeCount',
          buyCount: '$totalBuyCount',
          sellCount: { $subtract: ['$totalTradeCount', '$totalBuyCount'] },
          grossPairAmount: { $toString: '$totalGrossAmount' },
          assetAmount: { $toString: '$totalAssetAmount' },
        },
      },
    },
  ];
};

export default buildLaunchVolumePipeline;
