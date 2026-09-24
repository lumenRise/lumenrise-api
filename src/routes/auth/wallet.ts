import type { RequestHandler } from 'express';

import log from '../../logger.js';
import { setSessionCookie } from '../../services/auth/session.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import { createWalletChallenge } from '../../services/auth/walletChallenge.js';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress.js';
import { loginWalletIdentity, registerWalletIdentity } from '../../services/auth/walletIdentity.js';
import type {
  WalletAuthChallengeResult,
  WalletAuthPurpose,
  WalletAuthResult,
} from '../../types/auth/wallet.js';

const parseAddress = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toUpperCase() : '';
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
const postWalletAuthRoute =
  (purpose: WalletAuthPurpose): RequestHandler =>
  async (req, res) => {
    const address = parseAddress(req.body?.address);
    const challengeId = req.body?.challengeId;
    const signature = req.body?.signature;
    const name = req.body?.name;

    if (
      !isValidStellarGAddress(address) ||
      typeof challengeId !== 'string' ||
      typeof signature !== 'string' ||
      signature.length === 0 ||
      signature.length > 200 ||
      (purpose === 'register' &&
        (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 80))
    ) {
      const response: ApiResponse<EmptyResult> = {
        status: 'error',
        message: 'Invalid wallet authentication request',
        result: {},
      };

      return res.status(400).json(response);
    }

    try {
      const outcome =
        purpose === 'register'
          ? await registerWalletIdentity(address, name.trim(), challengeId, signature)
          : await loginWalletIdentity(address, challengeId, signature);

      if (!outcome.ok) {
        const status =
          outcome.reason === 'invalid_proof'
            ? 401
            : outcome.reason === 'already_registered'
              ? 409
              : 404;
        const response: ApiResponse<EmptyResult> = {
          status: 'error',
          message:
            outcome.reason === 'invalid_proof'
              ? 'Invalid or expired wallet proof'
              : outcome.reason === 'already_registered'
                ? 'Wallet is already registered'
                : 'Wallet account was not found',
          result: {},
        };

        return res.status(status).json(response);
      }

      const response: ApiResponse<WalletAuthResult> = {
        status: 'success',
        message: purpose === 'register' ? 'Wallet account registered' : 'Wallet login successful',
        result: outcome.result,
      };

      setSessionCookie(res, {
        token: outcome.result.accessToken,
        expiresAt: new Date(outcome.result.expiresAt),
      });

      return res.status(purpose === 'register' ? 201 : 200).json(response);
    } catch (error) {
      log.error({ error }, 'Wallet authentication failed');

      return res
        .status(503)
        .json({ status: 'error', message: 'Wallet authentication is unavailable', result: {} });
    }
  };

export { postWalletAuthRoute, postWalletChallengeRoute };
