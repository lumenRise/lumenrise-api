import { Types } from 'mongoose';
import { randomBytes } from 'node:crypto';

import { hashName } from './hashName.js';
import { hashWalletMessage } from './hashWalletMessage.js';
import { getNetworkPassphrase } from './getNetworkPassphrase.js';
import WalletAuthChallenge from '../../../../models/WalletAuthChallenge.js';
import { CHALLENGE_TTL_MS } from '../../../../constants/services/auth/walletChallenge.js';
import type {
  WalletAuthChallengeResult,
  WalletAuthPurpose,
} from '../../../../types/auth/wallet.js';

const createWalletChallenge = async (
  address: string,
  purpose: WalletAuthPurpose,
  name: string | null = null,
): Promise<WalletAuthChallengeResult> => {
  const challengeId = new Types.ObjectId();
  const nonce = randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  const nameHash = name === null ? null : hashName(name);
  const networkPassphrase = getNetworkPassphrase();

  const message = [
    'Lumenrise Wallet Authentication',
    'Version: 1',
    `Purpose: ${purpose}`,
    `Network: ${networkPassphrase}`,
    `Address: ${address}`,
    `Challenge ID: ${challengeId.toString()}`,
    `Nonce: ${nonce}`,
    `Name: ${name ?? 'none'}`,
    `Name Hash: ${nameHash ?? 'none'}`,
    `Expires At: ${expiresAt.toISOString()}`,
  ].join('\n');

  await WalletAuthChallenge.create({
    _id: challengeId,
    address,
    purpose,
    nameHash,
    messageHash: hashWalletMessage(message).toString('hex'),
    expiresAt,
  });

  return {
    challengeId: challengeId.toString(),
    address,
    purpose,
    message,
    networkPassphrase,
    expiresAt: expiresAt.toISOString(),
  };
};

export { createWalletChallenge };
