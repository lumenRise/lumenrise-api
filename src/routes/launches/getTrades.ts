import type { RequestHandler } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

import log from '../../logger';
import Launch from '../../models/Launch';
import LaunchTrade from '../../models/LaunchTrade';
import toTradeResult from '../../utils/launch/toTradeResult';
import type { TradePosition } from '../../types/launch/market';
import parseMarketRequest from '../../utils/launch/parseMarketRequest';

const getTrades: RequestHandler = async (req, res) => {
  const identity = parseMarketRequest(req);

  const limit =
    typeof req.query.limit === 'string'
      ? Number(req.query.limit)
      : req.query.limit === undefined
        ? 20
        : NaN;

  const trader = req.query.trader;
  const side = req.query.side;
  let after: TradePosition | null = null;

  try {
    if (req.query.cursor !== undefined) {
      if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 512) {
        throw new Error('Invalid cursor');
      }

      const parsed: unknown = JSON.parse(
        Buffer.from(req.query.cursor, 'base64url').toString('utf8'),
      );

      if (
        !Array.isArray(parsed) ||
        parsed.length !== 4 ||
        typeof parsed[0] !== 'string' ||
        !parsed.slice(1).every((v) => Number.isSafeInteger(v) && v >= 0)
      ) {
        throw new Error('Invalid cursor');
      }

      const tradedAt = new Date(parsed[0]);

      if (!Number.isFinite(tradedAt.getTime())) {
        throw new Error('Invalid cursor');
      }

      after = {
        tradedAt,
        ledger: parsed[1],
        transactionIndex: parsed[2],
        operationIndex: parsed[3],
      };
    }
  } catch {
    return res.status(400).json({ status: 'error', message: 'Invalid trade cursor', result: {} });
  }

  if (
    !identity ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    (trader !== undefined &&
      (typeof trader !== 'string' || !StrKey.isValidEd25519PublicKey(trader))) ||
    (side !== undefined && side !== 'buy' && side !== 'sell')
  ) {
    return res.status(400).json({ status: 'error', message: 'Invalid trade query', result: {} });
  }

  try {
    const launch = await Launch.findOne(identity).lean();
    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const pagination = after
      ? {
          $or: [
            { tradedAt: { $lt: after.tradedAt } },
            { tradedAt: after.tradedAt, ledger: { $lt: after.ledger } },
            {
              tradedAt: after.tradedAt,
              ledger: after.ledger,
              transactionIndex: { $lt: after.transactionIndex },
            },
            {
              tradedAt: after.tradedAt,
              ledger: after.ledger,
              transactionIndex: after.transactionIndex,
              operationIndex: { $lt: after.operationIndex },
            },
          ],
        }
      : {};

    const rows = await LaunchTrade.find({
      ...identity,
      ...(trader ? { trader } : {}),
      ...(side ? { side } : {}),
      ...pagination,
    })
      .sort({ tradedAt: -1, ledger: -1, transactionIndex: -1, operationIndex: -1 })
      .limit(limit + 1)
      .lean();
    const items = rows.slice(0, limit).map((trade) => toTradeResult(trade, launch.asset));

    const last = rows.slice(0, limit).at(-1);

    const nextCursor =
      rows.length > limit && last
        ? Buffer.from(
            JSON.stringify([
              last.tradedAt.toISOString(),
              last.ledger,
              last.transactionIndex,
              last.operationIndex,
            ]),
          ).toString('base64url')
        : null;

    res.set('Cache-Control', 'public, max-age=5');

    return res.json({
      status: 'success',
      message: 'Trades retrieved',
      result: {
        items,
        nextCursor,
        amountScale: 7,
        priceScale: 7,
        pair: launch.pair,
      },
    });
  } catch (error) {
    log.error({ error }, 'Trade list failed');
    return res
      .status(503)
      .json({ status: 'error', message: 'Trades are temporarily unavailable', result: {} });
  }
};

export default getTrades;
