import { StrKey } from '@stellar/stellar-sdk';
import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import Launch from '../../models/Launch';
import toLaunchResult from '../../utils/launch/toLaunchResult';

const getLaunchesRoute: RequestHandler = async (req, res) => {
  const network = req.query.network ?? env.STELLAR_AUTH_NETWORK;
  const owner = req.query.owner;
  const limitRaw = req.query.limit ?? '20';
  const pageRaw = req.query.page ?? '1';
  const limit = typeof limitRaw === 'string' ? Number(limitRaw) : NaN;
  const page = typeof pageRaw === 'string' ? Number(pageRaw) : NaN;

  if (
    (network !== 'testnet' && network !== 'public') ||
    (owner !== undefined && (
      typeof owner !== 'string' ||
      (!StrKey.isValidEd25519PublicKey(owner) && !StrKey.isValidContract(owner))
    )) ||
    !Number.isInteger(limit) || limit < 1 || limit > 100 ||
    !Number.isInteger(page) || page < 1 || page > 100_000
  ) {
    return res.status(400).json({ status: 'error', message: 'Invalid launch list query', result: {} });
  }

  try {
    const filter = {
      network: network as 'testnet' | 'public',
      ...(owner ? { owner } : {}),
    };

    const [launches, total] = await Promise.all([
      Launch.find(filter).sort({ _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Launch.countDocuments(filter),
    ]);

    return res.status(200).json({
      status: 'success',
      message: 'Launches retrieved',
      result: { launches: launches.map(toLaunchResult), page, limit, total },
    });
  } catch (error) {
    log.error({ error }, 'Launch list failed');

    return res.status(503).json({
      status: 'error',
      message: 'Launches are temporarily unavailable',
      result: {},
    });
  }
};

export default getLaunchesRoute;
