import type { Hex } from 'viem';
import type { RequestHandler } from 'express';
import { decodeEventLog, toEventSelector } from 'viem';

import log from '../../logger';
import Launch from '../../models/Launch';
import factoryAbi from '../../constants/base/factoryAbi';
import toLaunchResult from '../../utils/launch/toLaunchResult';
import getBaseContext from '../../services/base/getBaseContext';
import acquireBaseLease from '../../services/base/acquireBaseLease';
import releaseBaseLease from '../../services/base/releaseBaseLease';
import processBaseBlock from '../../services/base/processBaseBlock';
import reconcileBaseChain from '../../services/base/reconcileBaseChain';

const postBaseConfirmation: RequestHandler = async (req, res): Promise<unknown> => {
  const hash = req.body.transactionHash as Hex;

  try {
    const context = await getBaseContext(req.network);
    const receipt = await context.client.getTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
      return res.status(400).json({ status: 'error', message: 'Transaction failed', result: {} });
    }

    if (
      receipt.transactionHash.toLowerCase() !== hash.toLowerCase() ||
      receipt.logs.some(
        (event): boolean => event.transactionHash?.toLowerCase() !== hash.toLowerCase(),
      )
    ) {
      throw new Error('Base receipt hash mismatch');
    }

    const creations = receipt.logs.filter(
      (event): boolean =>
        event.address.toLowerCase() === context.configuration.factoryAddress &&
        event.topics[0] ===
          toEventSelector('LaunchCreated(uint256,address,address,address,uint256)'),
    );

    if (creations.length === 0) {
      return res
        .status(400)
        .json({
          status: 'error',
          message: 'No configured factory launch in transaction',
          result: {},
        });
    }

    const block = await context.client.getBlock({ blockNumber: receipt.blockNumber });

    if (block.hash !== receipt.blockHash || block.number !== receipt.blockNumber) {
      throw new Error('Base receipt is no longer canonical');
    }

    const writeContext = await acquireBaseLease(context);

    if (!writeContext) {
      res.set('Retry-After', '2');

      return res
        .status(202)
        .json({
          status: 'pending',
          message: 'Launch indexing is busy; retry the same hash',
          result: {},
        });
    }

    try {
      await reconcileBaseChain(writeContext);

      await processBaseBlock({
        context: writeContext,
        number: block.number,
        hash: block.hash!,
        timestamp: block.timestamp,
        logs: receipt.logs,
      });
    } finally {
      await releaseBaseLease(writeContext);
    }

    const addresses = creations.map((event): string =>
      decodeEventLog({
        abi: factoryAbi,
        data: event.data,
        topics: event.topics,
        eventName: 'LaunchCreated',
        strict: true,
      }).args.curve.toLowerCase(),
    );

    const launches = await Launch.find({
      chain: 'base',
      network: req.network,
      factoryContractId: context.configuration.factoryAddress,
      contractId: { $in: addresses },
    }).lean();

    if (launches.length !== addresses.length) {
      throw new Error('Confirmed launch is not indexed');
    }

    return res.json({
      status: 'success',
      message: 'Launch recorded',
      result: { launches: launches.map((launch) => toLaunchResult(launch)) },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TransactionReceiptNotFoundError') {
      res.set('Retry-After', '2');

      return res
        .status(202)
        .json({ status: 'pending', message: 'Transaction not available yet', result: {} });
    }

    log.warn({ error, chain: 'base', network: req.network }, 'Base launch confirmation deferred');

    return res
      .status(503)
      .json({
        status: 'error',
        message: 'Launch recording unavailable; retry the same hash',
        result: {},
      });
  }
};

export default postBaseConfirmation;
