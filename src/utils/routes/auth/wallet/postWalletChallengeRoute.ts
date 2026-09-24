import type { RequestHandler } from 'express';

import log from '../../../../logger.js';
import { parseAddress } from './parseAddress.js';
import type { ApiResponse, EmptyResult } from '../../../../types/response.js';
import isValidStellarGAddress from '../../../stellar/isValidStellarGAddress.js';
import { createWalletChallenge } from '../../../../services/auth/walletChallenge.js';
import type {
  WalletAuthChallengeResult,
  WalletAuthPurpose,
} from '../../../../types/auth/wallet.js';

const postWalletChallengeRoute: RequestHandler = async (req, res) => {
  const address = parseAddress(req.body?.address);
  const purpose = req.body?.purpose;
  const name = req.body?.name;

  if (
    !isValidStellarGAddress(address) ||
    (purpose !== 'register' && purpose !== 'login') ||
    (purpose === 'register' &&
      (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80))
  ) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid wallet challenge request',
      result: {},
    };

    return res.status(400).json(response);
  }

  try {
    const challenge = await createWalletChallenge(
      address,
      purpose as WalletAuthPurpose,
      purpose === 'register' ? name.trim() : null,
    );

    const response: ApiResponse<WalletAuthChallengeResult> = {
      status: 'success',
      message: 'Wallet challenge created',
      result: challenge,
    };

    return res.status(201).json(response);
  } catch (error) {
    log.error({ error }, 'Wallet challenge creation failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Wallet authentication is unavailable', result: {} });
  }
};

export { postWalletChallengeRoute };
