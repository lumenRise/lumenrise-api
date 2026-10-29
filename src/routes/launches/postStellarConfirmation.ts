import type { RequestHandler } from 'express';

import log from '../../logger';
import getLaunchRpc from '../../services/launch/getLaunchRpc';
import toLaunchResult from '../../utils/launch/toLaunchResult';
import getNetworkConfig from '../../services/network/getNetworkConfig';
import decodeLaunchCreation from '../../utils/launch/decodeLaunchCreation';
import recordStellarLaunch from '../../services/launch/recordStellarLaunch';

const postStellarConfirmation: RequestHandler = async (req, res): Promise<unknown> => {
  const hash = (req.body.transactionHash as string).toLowerCase();

  try {
    const server = await getLaunchRpc(req.network);
    const transaction = await server.getTransaction(hash);

    if (transaction.status === 'NOT_FOUND') {
      res.set('Retry-After', '5');

      return res
        .status(202)
        .json({ status: 'pending', message: 'Transaction not available yet', result: {} });
    }

    if (transaction.status !== 'SUCCESS') {
      return res.status(400).json({ status: 'error', message: 'Transaction failed', result: {} });
    }

    if (transaction.txHash.toLowerCase() !== hash) {
      throw new Error('Stellar transaction hash mismatch');
    }

    const configuration = getNetworkConfig(req.network);
    const contractId = decodeLaunchCreation(transaction, configuration.factoryContractId);

    if (!contractId) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Not a direct configured factory launch', result: {} });
    }

    const launch = await recordStellarLaunch(server, req.network, contractId, transaction);

    return res.json({
      status: 'success',
      message: 'Launch recorded',
      result: { launches: [toLaunchResult(launch)] },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'LaunchNameConflict') {
      return res.status(409).json({ status: 'error', message: error.message, result: {} });
    }

    log.warn(
      { error, chain: 'stellar', network: req.network },
      'Stellar launch confirmation deferred',
    );

    return res
      .status(503)
      .json({
        status: 'error',
        message: 'Launch recording unavailable; retry the same hash',
        result: {},
      });
  }
};

export default postStellarConfirmation;
