import type { RequestHandler } from 'express';

import log from '../../logger';
import Launch from '../../models/Launch';
import LaunchHolder from '../../models/LaunchHolder';
import getLaunchScales from '../../utils/launch/getLaunchScales';
import parseHolderRequest from '../../utils/launch/parseHolderRequest';
import toPublicMarketIdentity from '../../utils/launch/toPublicMarketIdentity';

const getHolders: RequestHandler = async (req, res) => {
  const request = parseHolderRequest(req);

  if (!request) {
    return res.status(400).json({ status: 'error', message: 'Invalid holder query', result: {} });
  }

  try {
    const { identity, limit, after } = request;
    const launch = await Launch.findOne(identity).lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const pagination = after
      ? {
          $or: [
            { balanceSort: { $lt: after.balanceSort } },
            { balanceSort: after.balanceSort, address: { $gt: after.address } },
          ],
        }
      : {};

    const [rows, totalHolders] = await Promise.all([
      LaunchHolder.find({
        ...identity,
        ...(identity.chain === 'base' ? { balance: { $ne: '0' } } : {}),
        ...pagination,
      })
        .sort({ balanceSort: -1, address: 1 })
        .limit(limit + 1)
        .lean(),
      LaunchHolder.countDocuments({
        ...identity,
        ...(identity.chain === 'base' ? { balance: { $ne: '0' } } : {}),
      }),
    ]);

    const page = rows.slice(0, limit);
    const last = page.at(-1);

    const nextCursor =
      rows.length > limit && last
        ? Buffer.from(JSON.stringify([last.balance, last.address])).toString('base64url')
        : null;

    res.set('Cache-Control', 'public, max-age=5');

    return res.json({
      status: 'success',
      message: 'Holders retrieved',
      result: {
        ...toPublicMarketIdentity(identity),
        asset: launch.asset,
        amountScale: getLaunchScales(launch).amountScale,
        balanceSource: 'token_contract',
        coverage: identity.chain === 'base' ? 'indexed_trades_and_transfers' : 'trade_participants',
        totalHolders,
        nextCursor,
        items: page.map((holder) => ({
          address: holder.address,
          balance: holder.balance,
          observedAt: holder.observedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    log.error({ error }, 'Holder list failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Holders are temporarily unavailable', result: {} });
  }
};

export default getHolders;
