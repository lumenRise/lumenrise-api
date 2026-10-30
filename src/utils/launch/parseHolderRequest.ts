import type { Request } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

import isBaseAddress from '../base/isBaseAddress';
import parseMarketRequest from './parseMarketRequest';
import applicationRules from '../../constants/applicationRules';
import type { HolderPosition, HolderRequest } from '../../types/launch/holder';

const parseHolderRequest = (req: Request): HolderRequest | null => {
  const identity = parseMarketRequest(req);

  const limit =
    req.query.limit === undefined
      ? applicationRules.holders.defaultLimit
      : typeof req.query.limit === 'string'
        ? Number(req.query.limit)
        : NaN;

  let after: HolderPosition | null = null;

  if (
    !identity ||
    !Number.isInteger(limit) ||
    limit < applicationRules.holders.minLimit ||
    limit > applicationRules.holders.maxLimit
  ) {
    return null;
  }

  if (req.query.cursor !== undefined) {
    if (
      typeof req.query.cursor !== 'string' ||
      req.query.cursor.length > applicationRules.holders.cursorMaxLength
    ) {
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
        (req.chain === 'base'
          ? !isBaseAddress(value[1])
          : !StrKey.isValidEd25519PublicKey(value[1]) && !StrKey.isValidContract(value[1]))
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
