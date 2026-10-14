import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import Launch from '../../models/Launch';
import LaunchTrade from '../../models/LaunchTrade';
import type { TradeRecord } from '../../types/launch/market';
import toTradeResult from '../../utils/launch/toTradeResult';
import getLaunchRpc from '../../services/launch/getLaunchRpc';
import parseTradeInteger from '../../utils/launch/parseTradeInteger';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';
import recordLaunchPrice from '../../services/launch/recordLaunchPrice';
import readLaunchContract from '../../services/launch/readLaunchContract';
import decodeTradeTransaction from '../../utils/launch/decodeTradeTransaction';

const postTrade: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);
  const hash: unknown = req.body?.transactionHash;

  if (
    !identity ||
    identity.network !== env.STELLAR_AUTH_NETWORK ||
    typeof hash !== 'string' ||
    !/^[a-fA-F0-9]{64}$/.test(hash)
  ) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Invalid trade submission', result: {} });
  }

  const transactionHash = hash.toLowerCase();

  try {
    const launch = await Launch.findOne(identity).lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const key = { ...identity, transactionHash, operationIndex: 0 };

    let trade: TradeRecord | null = await LaunchTrade.findOne(key).lean();

    const respond = () =>
      res.json({
        status: 'success',
        message: 'Trade recorded',
        result: {
          trade: toTradeResult(trade!, launch.asset),
          pair: launch.pair,
          amountScale: 7,
          priceScale: 7,
        },
      });

    if (trade?.priceRecordedAt) {
      return respond();
    }

    const server = await getLaunchRpc();

    if (!trade) {
      const transaction = await server.getTransaction(transactionHash);

      if (transaction.status === 'NOT_FOUND') {
        res.set('Retry-After', '5');

        return res
          .status(202)
          .json({ status: 'pending', message: 'Transaction not available yet', result: {} });
      }

      if (transaction.status !== 'SUCCESS') {
        return res.status(400).json({ status: 'error', message: 'Transaction failed', result: {} });
      }

      try {
        trade = decodeTradeTransaction(transaction, identity);
      } catch {
        trade = null;
      }

      if (!trade) {
        return res
          .status(400)
          .json({ status: 'error', message: 'Not a direct launch buy or sell', result: {} });
      }

      try {
        await LaunchTrade.updateOne(key, { $setOnInsert: trade }, { upsert: true });
      } catch (error) {
        if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 11000) {
          throw error;
        }
      }
    }

    const stateRead = await readLaunchContract(server, identity.contractId, 'get_state');
    const priceRead = await readLaunchContract(server, identity.contractId, 'current_price');

    if (stateRead.ledger < trade.ledger || priceRead.ledger < stateRead.ledger) {
      throw new Error('RPC observation is behind the trade');
    }

    const state = JSON.parse(
      JSON.stringify(stateRead.value, (_key, value: unknown) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    ) as Record<string, unknown>;

    const price = parseTradeInteger(priceRead.value);
    const sold = parseTradeInteger(state.sold);

    if (price <= 0n || sold < 0n || typeof state.graduated !== 'boolean') {
      throw new Error('Invalid launch state');
    }

    const sampledAt = new Date();

    await recordLaunchPrice(identity, priceRead, sampledAt);

    const params = launch.config.params as { ends_at: string };

    const stopped =
      state.graduated === true ||
      (BigInt(Math.floor(sampledAt.getTime() / 1000)) >= BigInt(params.ends_at) && sold === 0n);

    await Launch.updateOne(
      { ...identity, stateAsOfLedger: { $lte: stateRead.ledger } },
      {
        $set: {
          state,
          stateAsOfLedger: stateRead.ledger,
          stateObservedAt: sampledAt,
          nextStatePollAt: stopped ? null : new Date(sampledAt.getTime() + 600_000),
        },
      },
    );

    await LaunchTrade.updateOne(key, { $set: { priceRecordedAt: sampledAt } });

    return respond();
  } catch (error) {
    log.warn({ error }, 'Trade submission deferred');

    res.set('Retry-After', '5');

    return res.status(503).json({
      status: 'error',
      message: 'Trade recording temporarily unavailable; retry the same hash',
      result: {},
    });
  }
};

export default postTrade;
