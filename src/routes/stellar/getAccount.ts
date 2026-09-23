import type { RequestHandler } from 'express';

import log from '../../logger.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { StellarAccountOverviewResult } from '../../types/stellar/account.js';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress.js';
import getStellarAccountOverview from '../../services/stellar/getAccountOverview.js';

const getStellarAccountRoute: RequestHandler = async (req, res) => {
  const address = typeof req.params.address === 'string' ? req.params.address.toUpperCase() : '';

  if (!isValidStellarGAddress(address)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid Stellar account address',
      result: {},
    };

    return res.status(400).json(response);
  }

  try {
    const account = await getStellarAccountOverview(address);

    if (!account) {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'Stellar account was not found',
        result: {},
      };

      return res.status(404).json(response);
    }

    const response: ApiResponse<StellarAccountOverviewResult> = {
      status: 'success',
      message: 'Stellar account overview retrieved',
      result: account,
    };

    return res.status(200).json(response);
  } catch (error) {
    log.warn({ error, address }, 'Stellar account lookup failed');

    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Stellar account data is temporarily unavailable',
      result: {},
    };

    return res.status(502).json(response);
  }
};

export default getStellarAccountRoute;
