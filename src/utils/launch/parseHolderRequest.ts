import type { Request } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

import parseMarketRequest from './parseMarketRequest';
import type { HolderPosition, HolderRequest } from '../../types/launch/holder';

const parseHolderRequest = (req: Request): HolderRequest | null => {
  const identity = parseMarketRequest(req);
  const limit =
    req.query.limit === undefined
      ? 20
      : typeof req.query.limit === 'string'
        ? Number(req.query.limit)
        : NaN;

  let after: HolderPosition | null = null;

  if (!identity || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return null;
  }

  if (req.query.cursor !== undefined) {
    if (typeof req.query.cursor !== 'string' || req.query.cursor.length > 512) {
      return null;
    }

    try {
      const value: unknown = JSON.parse(
        Buffer.from(req.query.cursor, 'base64url').toString('utf8'),
      );

      if (
        !Array.isArray(value) ||
        value.length !== 2 ||
        typeof value[0] !== 'string' ||
        !/^[1-9]\d{0,38}$/.test(value[0]) ||
        typeof value[1] !== 'string' ||
        (!StrKey.isValidEd25519PublicKey(value[1]) && !StrKey.isValidContract(value[1]))
      ) {
        return null;
      }

      after = { balanceSort: value[0].padStart(39, '0'), address: value[1] };
    } catch {
      return null;
    }
  }

  return { identity, limit, after };
};

export default parseHolderRequest;
