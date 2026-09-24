import type { RequestHandler } from 'express';

import log from '../../logger.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress.js';
import type {
  StellarOperationOrder,
  StellarOperationsResult,
} from '../../types/stellar/operations.js';
import getStellarAccountOperations, {
  STELLAR_OPERATIONS_PAGE_LIMIT,
} from '../../services/stellar/getAccountOperations.js';

const getStellarAccountOperationsRoute: RequestHandler = async (req, res) => {
  const address = typeof req.params.address === 'string' ? req.params.address.toUpperCase() : '';
  const cursor = req.query.cursor;
  const requestedLimit = req.query.limit;
  const requestedOrder = req.query.order;
  const limit = requestedLimit === undefined ? 50 : Number(requestedLimit);

  if (!isValidStellarGAddress(address)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid Stellar account address',
      result: {},
    };

    return res.status(400).json(response);
  }

  if (
    (cursor !== undefined && (typeof cursor !== 'string' || !/^\d{1,40}$/.test(cursor))) ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > STELLAR_OPERATIONS_PAGE_LIMIT ||
    (requestedOrder !== undefined && requestedOrder !== 'asc' && requestedOrder !== 'desc')
  ) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid Stellar operations pagination parameters',
      result: {},
    };

    return res.status(400).json(response);
  }

  try {
    const page = await getStellarAccountOperations(
      address,
      cursor ?? null,
      limit,
      (requestedOrder ?? 'desc') as StellarOperationOrder,
    );

    if (!page) {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'Stellar account was not found',
        result: {},
      };

      return res.status(404).json(response);
    }

    const response: ApiResponse<StellarOperationsResult> = {
      status: 'success',
      message: 'Stellar account operations retrieved',
      result: page,
    };

    return res.status(200).json(response);
  } catch (error) {
    log.warn({ error, address }, 'Stellar account operations lookup failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Stellar operations data is temporarily unavailable',
      result: {},
    };

    return res.status(502).json(response);
  }
};

export default getStellarAccountOperationsRoute;
