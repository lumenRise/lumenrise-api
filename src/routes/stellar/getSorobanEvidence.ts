import type { RequestHandler } from 'express';

import log from '../../logger';
import applicationRules from '../../constants/applicationRules';
import type { ApiResponse, EmptyResult } from '../../types/response';
import type { SorobanEvidenceResult } from '../../types/stellar/soroban';
import requestDomainRead from '../../services/messaging/requestDomainRead';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress';

const getSorobanEvidenceRoute: RequestHandler = async (req, res) => {
  const address = typeof req.params.address === 'string' ? req.params.address.toUpperCase() : '';

  const limit =
    req.query.limit === undefined
      ? applicationRules.stellar.sorobanEvidence.defaultLimit
      : Number(req.query.limit);

  const cursor = req.query.cursor;

  if (
    !isValidStellarGAddress(address) ||
    !Number.isInteger(limit) ||
    limit < applicationRules.stellar.sorobanEvidence.minLimit ||
    limit > applicationRules.stellar.sorobanEvidence.maxLimit ||
    (cursor !== undefined && (typeof cursor !== 'string' || !/^[a-f\d]{24}$/i.test(cursor)))
  ) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid Soroban evidence request',
      result: {},
    };

    return res.status(400).json(response);
  }

  try {
    const result = await requestDomainRead<SorobanEvidenceResult | null>(
      'reputation',
      'soroban.evidence',
      { identity: req.auth!.identityId.toString(), address, network: req.network, limit, cursor },
    );

    if (!result) {
      return res
        .status(404)
        .json({ status: 'error', message: 'Stellar activity scan was not found', result: {} });
    }

    return res
      .status(200)
      .json({ status: 'success', message: 'Soroban evidence retrieved', result });
  } catch (error) {
    log.error({ error, address }, 'Soroban evidence lookup failed');

    return res.status(503).json({
      status: 'error',
      message: 'Soroban evidence is temporarily unavailable',
      result: {},
    });
  }
};

export default getSorobanEvidenceRoute;
