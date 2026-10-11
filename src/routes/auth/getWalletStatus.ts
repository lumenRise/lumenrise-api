import type { RequestHandler } from 'express';

import log from '../../logger';
import type { ApiResponse } from '../../types/response';
import StellarAccount from '../../models/StellarAccount';
import type { WalletStatusResult } from '../../types/auth/wallet';
import { parseAddress } from '../../utils/routes/auth/wallet/parseAddress';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress';

const getWalletStatusRoute: RequestHandler = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');

  const address = parseAddress(req.query.address);

  if (!isValidStellarGAddress(address)) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid Stellar account address',
      result: {},
    });
  }

  try {
    const registered = Boolean(await StellarAccount.exists({ address }));
    const response: ApiResponse<WalletStatusResult> = {
      status: 'success',
      message: 'Wallet registration status',
      result: { registered },
    };

    return res.status(200).json(response);
  } catch (error) {
    log.error({ error }, 'Wallet registration status lookup failed');

    return res.status(503).json({
      status: 'error',
      message: 'Wallet registration status is unavailable',
      result: {},
    });
  }
};

export default getWalletStatusRoute;
