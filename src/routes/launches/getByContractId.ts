import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import toLaunchResult from '../../utils/launch/toLaunchResult';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';
import getPublicLaunchTeam from '../../services/launch/getPublicLaunchTeam';

const getLaunchByContractIdRoute: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);

  if (!identity) {
    return res.status(400).json({ status: 'error', message: 'Invalid launch query', result: {} });
  }

  try {
    const launch = await Launch.findOne(identity).lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const team = await getPublicLaunchTeam(launch);

    return res.status(200).json({
      status: 'success',
      message: 'Launch retrieved',
      result: { ...toLaunchResult(launch), team },
    });
  } catch (error) {
    log.error({ error, identity }, 'Launch lookup failed');

    return res.status(503).json({
      status: 'error',
      message: 'Launch is temporarily unavailable',
      result: {},
    });
  }
};

export default getLaunchByContractIdRoute;
