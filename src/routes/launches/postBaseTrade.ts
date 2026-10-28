import type { Hex } from 'viem';
import { toEventSelector } from 'viem';
import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import toTradeResult from '../../utils/launch/toTradeResult';
import getBaseContext from '../../services/base/getBaseContext';
import decodeBaseTrade from '../../services/base/decodeBaseTrade';
import acquireBaseLease from '../../services/base/acquireBaseLease';
import releaseBaseLease from '../../services/base/releaseBaseLease';
import processBaseBlock from '../../services/base/processBaseBlock';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';
import reconcileBaseChain from '../../services/base/reconcileBaseChain';

const postBaseTrade: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);
  const hash: unknown = req.body?.transactionHash;

  if (
    !identity ||
    typeof hash !== 'string' ||
    !/^0x[a-fA-F0-9]{64}$/.test(hash) ||
    (req.body?.network !== undefined && req.body.network !== req.network)
  ) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid Base trade submission', result: {} });
  }

  try {
    const context = await getBaseContext(req.network);

    const launch = await Launch.findOne({
      ...identity,
      factoryContractId: context.configuration.factoryAddress,
    }).lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const receipt = await context.client.getTransactionReceipt({ hash: hash as Hex });

    if (receipt.status !== 'success') {
      return res.status(400).json({ status: 'error', message: 'Transaction failed', result: {} });
    }

    if (
      receipt.transactionHash.toLowerCase() !== hash.toLowerCase() ||
      receipt.logs.some(
        (event): boolean => event.transactionHash?.toLowerCase() !== hash.toLowerCase(),
      )
    ) {
      throw new Error('Base receipt does not match the submitted transaction hash');
    }

    const block = await context.client.getBlock({ blockNumber: receipt.blockNumber });

    if (receipt.blockHash !== block.hash) {
      throw new Error('Base receipt is no longer canonical');
    }

    const logs = receipt.logs.filter(
      (event): boolean =>
        event.address.toLowerCase() === launch.contractId &&
        event.topics[0] === toEventSelector('Trade(address,bool,uint128,uint128,uint128,uint128)'),
    );

    const trades = logs.map((event) =>
      decodeBaseTrade({ network: req.network, log: event, timestamp: block.timestamp }),
    );

    if (trades.length === 0) {
      return res
        .status(400)
        .json({ status: 'error', message: 'Transaction has no trade for this launch', result: {} });
    }

    const writeContext = await acquireBaseLease(context);

    if (!writeContext) {
      res.set('Retry-After', '2');

      return res
        .status(202)
        .json({ status: 'pending', message: 'Trade verified; indexing is busy', result: {} });
    }

    try {
      await reconcileBaseChain(writeContext);

      if (
        !(await Launch.exists({
          ...identity,
          factoryContractId: context.configuration.factoryAddress,
        }))
      ) {
        res.set('Retry-After', '2');

        return res
          .status(202)
          .json({
            status: 'pending',
            message: 'Launch is being reindexed after a chain change',
            result: {},
          });
      }

      await processBaseBlock({
        context: writeContext,
        number: block.number,
        hash: block.hash!,
        timestamp: block.timestamp,
        logs,
      });
    } finally {
      await releaseBaseLease(writeContext);
    }

    return res.json({
      status: 'success',
      message: 'Trade recorded',
      result: {
        trade: toTradeResult(trades[0]!, launch.asset),
        trades: trades.map((trade) => toTradeResult(trade, launch.asset)),
        pair: launch.pair,
        amountScale: 7,
        priceScale: 7,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'TransactionReceiptNotFoundError') {
      res.set('Retry-After', '2');

      return res
        .status(202)
        .json({ status: 'pending', message: 'Transaction not available yet', result: {} });
    }

    log.warn({ error }, 'Base trade submission deferred');

    return res.status(503).json({
      status: 'error',
      message: 'Base trade recording unavailable; retry the same hash',
      result: {},
    });
  }
};

export default postBaseTrade;
