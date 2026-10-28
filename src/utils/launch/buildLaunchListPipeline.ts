import type { PipelineStage } from 'mongoose';

import type { LaunchListQuery } from '../../types/launch/list';
import launchUnsignedExpression from './launchUnsignedExpression';
import buildLaunchVolumePipeline from './buildLaunchVolumePipeline';

const buildLaunchListPipeline = (query: LaunchListQuery, now: Date): PipelineStage[] => {
  const direction = query.direction === 'asc' ? 1 : -1;
  const nowSeconds = Math.floor(now.getTime() / 1000);

  const emptyVolume = {
    grossPairAmount: '0',
    assetAmount: '0',
    tradeCount: 0,
    buyCount: 0,
    sellCount: 0,
  };

  const match: Record<string, unknown> = {
    chain: query.chain ?? 'stellar',
    network: query.network,
    ...(query.owner ? { owner: query.owner } : {}),
    ...(query.pair ? { pair: query.pair } : {}),
  };

  if (query.search) {
    const escaped = query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    match.$or = [
      { slug: { $regex: escaped, $options: 'i' } },
      { 'metadata.name': { $regex: escaped, $options: 'i' } },
      { 'metadata.symbol': { $regex: escaped, $options: 'i' } },
    ];
  }

  if (query.category === 'auction' || query.category === 'pre-sale') {
    match._id = { $in: [] };
  }

  const lookup: PipelineStage.Lookup = {
    $lookup: {
      from: 'launch_trades',
      let: { launchChain: '$chain', launchNetwork: '$network', launchContract: '$contractId' },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$chain', '$$launchChain'] },
                { $eq: ['$network', '$$launchNetwork'] },
                { $eq: ['$contractId', '$$launchContract'] },
              ],
            },
          },
        },
        ...buildLaunchVolumePipeline(now),
      ],
      as: '_market',
    },
  };

  const marketFields: PipelineStage.AddFields = {
    $addFields: {
      '_listing.tradeCount': {
        $ifNull: [{ $arrayElemAt: ['$_market.volume24h.tradeCount', 0] }, 0],
      },
      '_listing.grossVolume': {
        $toDecimal: { $ifNull: [{ $arrayElemAt: ['$_market.volume24h.grossPairAmount', 0] }, '0'] },
      },
      volume24h: { $ifNull: [{ $arrayElemAt: ['$_market.volume24h', 0] }, emptyVolume] },
      volumeTotal: { $ifNull: [{ $arrayElemAt: ['$_market.volumeTotal', 0] }, emptyVolume] },
    },
  };

  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $addFields: {
        '_listing.target': launchUnsignedExpression('$config.params.curve.graduation_target'),
        '_listing.reserve': launchUnsignedExpression('$state.quote_reserve'),
        '_listing.startsAt': {
          $convert: { input: '$config.params.starts_at', to: 'long', onError: null, onNull: null },
        },
        '_listing.endsAt': {
          $convert: { input: '$config.params.ends_at', to: 'long', onError: null, onNull: null },
        },
        '_listing.name': { $toLower: '$metadata.name' },
        '_listing.symbol': { $toLower: '$metadata.symbol' },
        '_listing.category': { $literal: 'bonding-curve' },
      },
    },
  ];

  if (query.sort === 'almostGraduated') {
    pipeline.push(
      {
        $match: {
          'state.graduated': false,
          '_listing.target': { $gt: 0 },
          '_listing.reserve': { $gte: 0 },
          '_listing.startsAt': { $ne: null, $lte: nowSeconds },
          $or: [
            { 'config.params.ends_at': { $exists: false } },
            { '_listing.endsAt': { $gt: nowSeconds } },
          ],
        },
      },
      {
        $addFields: {
          '_listing.progress': {
            $min: [1, { $divide: ['$_listing.reserve', '$_listing.target'] }],
          },
        },
      },
    );
  }

  const sorts: Record<LaunchListQuery['sort'], string> = {
    newest: 'createdAt',
    name: '_listing.name',
    symbol: '_listing.symbol',
    trending: '_listing.tradeCount',
    topVolume: '_listing.grossVolume',
    almostGraduated: '_listing.progress',
    participants: 'state.buyer_count',
    figure: '_listing.reserve',
    date: 'createdAt',
    phase: '_listing.phase',
    category: '_listing.category',
  };

  if (query.sort === 'phase') {
    pipeline.push({
      $addFields: {
        '_listing.phase': {
          $switch: {
            branches: [
              { case: { $eq: ['$state.graduated', true] }, then: 2 },
              { case: { $gt: ['$_listing.startsAt', nowSeconds] }, then: 0 },
              {
                case: {
                  $or: [
                    { $eq: [{ $type: '$config.params.ends_at' }, 'missing'] },
                    { $gt: ['$_listing.endsAt', nowSeconds] },
                  ],
                },
                then: 1,
              },
            ],
            default: 3,
          },
        },
      },
    });
  }

  const marketSort = query.sort === 'trending' || query.sort === 'topVolume';
  const sortField = sorts[query.sort];

  if (marketSort) {
    pipeline.push(lookup, marketFields);
  }

  pipeline.push({
    $addFields: {
      '_listing.missing': { $cond: [{ $eq: [{ $ifNull: [`$${sortField}`, null] }, null] }, 1, 0] },
    },
  });

  const pagePipeline: PipelineStage.Facet['$facet'][string] = [
    { $sort: { '_listing.missing': 1, [sortField]: direction, contractId: 1 } },
    { $skip: (query.page - 1) * query.limit },
    { $limit: query.limit },
  ];

  if (!marketSort) {
    pagePipeline.push(lookup, marketFields);
  }

  pagePipeline.push({ $project: { _listing: 0, _market: 0 } });

  pipeline.push({ $facet: { launches: pagePipeline, total: [{ $count: 'count' }] } });

  return pipeline;
};

export default buildLaunchListPipeline;
