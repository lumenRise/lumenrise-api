import { StrKey } from '@stellar/stellar-sdk';
import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import Launch from '../../models/Launch';
import toLaunchResult from '../../utils/launch/toLaunchResult';

const getLaunchByContractIdRoute: RequestHandler = async (req, res) => {
  const network = req.query.network ?? env.STELLAR_AUTH_NETWORK;
  const contractId = req.params.contractId;

  if (
    (network !== 'testnet' && network !== 'public') ||
    typeof contractId !== 'string' ||
    !StrKey.isValidContract(contractId)
  ) {
    return res.status(400).json({ status: 'error', message: 'Invalid launch query', result: {} });
  }

  try {
    const launch = await Launch.findOne({ network, contractId }).lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Launch retrieved',
      result: toLaunchResult(launch),
    });
  } catch (error) {
    log.error({ error, contractId }, 'Launch lookup failed');

    return res.status(503).json({
      status: 'error',
      message: 'Launch is temporarily unavailable',
      result: {},
    });
  }
};

export default getLaunchByContractIdRoute;
