import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import toLaunchResult from '../../utils/launch/toLaunchResult';
import StellarTransactionJob from '../../models/StellarTransactionJob';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';
import publishStellarTransactionJob from './publishStellarTransactionJob';

const submitStellarTransaction: RequestHandler = async (req, res): Promise<unknown> => {
  const hash: unknown = req.body?.transactionHash;

  const action: 'launch' | 'trade' =
    req.path.replace(/\/+$/, '') === '/confirm' ? 'launch' : 'trade';

  const contractId = action === 'launch' ? 'factory' : (parseMarketRequest(req)?.contractId ?? '');

  if (
    (action === 'trade' && !contractId) ||
    typeof hash !== 'string' ||
    !/^[0-9a-fA-F]{64}$/.test(hash) ||
    (req.body?.network !== undefined && req.body.network !== req.network)
  ) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid Stellar transaction submission', result: {} });
  }

  try {
    const launch =
      action === 'trade'
        ? await Launch.findOne({
            chain: 'stellar',
            network: req.network,
            contractId,
          }).lean()
        : null;

    if (action === 'trade' && !launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const key = { network: req.network, action, transactionHash: hash.toLowerCase(), contractId };
    let job;

    try {
      job = await StellarTransactionJob.findOneAndUpdate(
        key,
        {
          $setOnInsert: {
            ...key,
            status: 'queued',
            scheduledAt: new Date(),
            attempts: 0,
          },
        },
        { upsert: true, returnDocument: 'after' },
      );
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 11000) {
        throw error;
      }

      job = await StellarTransactionJob.findOne(key);
    }

    if (!job) {
      throw new Error('Transaction submission could not be persisted');
    }

    if (job.status === 'completed') {
      const result =
        action === 'launch'
          ? {
              launches: (
                await Launch.find({
                  chain: 'stellar',
                  network: req.network,
                  contractId: {
                    $in: Array.isArray(job.result?.launchContracts)
                      ? job.result.launchContracts
                      : [],
                  },
                }).lean()
              ).map((item) => toLaunchResult(item)),
            }
          : job.result;

      return res.json({ status: 'success', message: 'Transaction recorded', result });
    }

    if (job.status === 'failed') {
      return res
        .status(job.failureStatus ?? 400)
        .json({ status: 'error', message: job.lastError, result: {} });
    }

    if (job.status === 'queued' && job.attempts === 0) {
      try {
        await publishStellarTransactionJob(job._id.toString(), req.network);
      } catch (error) {
        log.warn(
          { error, jobId: job._id },
          'Stellar transaction persisted; worker reconciliation will retry delivery',
        );
      }
    }

    res.set('Retry-After', '2');

    return res.status(202).json({
      status: 'pending',
      message: 'Transaction queued for verification',
      result: { jobId: job._id.toString() },
    });
  } catch (error) {
    log.warn({ error }, 'Stellar transaction submission failed');

    return res.status(503).json({
      status: 'error',
      message: 'Transaction submission unavailable; retry the same hash',
      result: {},
    });
  }
};

export default submitStellarTransaction;
