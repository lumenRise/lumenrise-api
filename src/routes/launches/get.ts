import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import type { LaunchListPage } from '../../types/launch/list';
import toLaunchResult from '../../utils/launch/toLaunchResult';
import toLaunchVolume from '../../utils/launch/toLaunchVolume';
import parseLaunchListQuery from '../../utils/launch/parseLaunchListQuery';
import buildLaunchListPipeline from '../../utils/launch/buildLaunchListPipeline';

const getLaunchesRoute: RequestHandler = async (req, res): Promise<unknown> => {
  const query = parseLaunchListQuery(req.query, req.network, req.chain);

  if (!query) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid launch list query; topVolume and figure require pair',
      result: {},
    });
  }

  try {
    const now = new Date();
    const pipeline = buildLaunchListPipeline(query, now);
    const [result] = await Launch.aggregate<LaunchListPage>(pipeline);

    return res.status(200).json({
      status: 'success',
      message: 'Launches retrieved',
      result: {
        launches: (result?.launches ?? []).map((launch) => ({
          ...toLaunchResult(launch, now),
          category: 'bonding-curve',
          amountScale: 7,
          volume24h: toLaunchVolume(launch.volume24h),
          volumeTotal: toLaunchVolume(launch.volumeTotal),
        })),
        page: query.page,
        limit: query.limit,
        total: result?.total[0]?.count ?? 0,
        sort: query.sort,
        direction: query.direction,
        dateMeaning: 'contract_creation',
        statsAsOf: now.toISOString(),
        statsSince: new Date(now.getTime() - 86_400_000).toISOString(),
        statsCoverage:
          req.chain === 'base'
            ? 'verified_receipts_and_events'
            : 'verified_client_submitted_trades',
      },
    });
  } catch (error) {
    log.error({ error }, 'Launch list failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launches are temporarily unavailable', result: {} });
  }
};

export default getLaunchesRoute;
