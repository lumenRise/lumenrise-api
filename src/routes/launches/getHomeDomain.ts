import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import Launch from '../../models/Launch';
import parseHomeDomainQuery from './parseHomeDomainQuery';
import getLaunchHomeDomain from '../../services/homeDomain/getLaunchHomeDomain';

const getLaunchHomeDomainRoute: RequestHandler = async (req, res) => {
  const network = req.query.network ?? env.STELLAR_AUTH_NETWORK;
  const contractId = req.params.contractId;

  if (!parseHomeDomainQuery(network, contractId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid launch query', result: {} });
  }

  try {
    const launch = await Launch.findOne({ network, contractId }).lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const result = await getLaunchHomeDomain(launch);

    return res.status(200).json({ status: 'success', message: 'Home Domain status retrieved', result });
  } catch (error) {
    log.error({ error }, 'Home Domain lookup failed');

    return res.status(503).json({ status: 'error', message: 'Home Domain is temporarily unavailable', result: {} });
  }
};

export default getLaunchHomeDomainRoute;
