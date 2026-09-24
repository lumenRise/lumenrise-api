import { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import { Keypair, Networks } from '@stellar/stellar-sdk';

import env from '../../env.js';
import WalletAuthChallenge from '../../models/WalletAuthChallenge.js';
import type { WalletAuthChallengeResult, WalletAuthPurpose } from '../../types/auth/wallet.js';

const CHALLENGE_TTL_MS = 5 * 60_000;
const SIGNED_MESSAGE_PREFIX = 'Stellar Signed Message:\n';
const hashName = (name: string): string => createHash('sha256').update(name).digest('hex');
const getNetworkPassphrase = (): string =>
  env.STELLAR_AUTH_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET;
const hashWalletMessage = (message: string): Buffer =>
  createHash('sha256').update(SIGNED_MESSAGE_PREFIX).update(message, 'utf8').digest();
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
const consumeSignedWalletChallenge = async (
  challengeId: string,
  address: string,
  purpose: WalletAuthPurpose,
  signature: string,
  name: string | null = null,
): Promise<boolean> => {
  if (!Types.ObjectId.isValid(challengeId) || !/^[A-Za-z0-9+/]{86}==$/.test(signature)) {
    return false;
  }

  const challenge = await WalletAuthChallenge.findOne({
    _id: challengeId,
    address,
    purpose,
    nameHash: name === null ? null : hashName(name),
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!challenge) {
    return false;
  }

  try {
    const signatureBytes = Buffer.from(signature, 'base64');

    if (
      signatureBytes.length !== 64 ||
      signatureBytes.toString('base64') !== signature ||
      !Keypair.fromPublicKey(address).verify(
        Buffer.from(challenge.messageHash, 'hex'),
        signatureBytes,
      )
    ) {
      return false;
    }
  } catch {
    return false;
  }

  const consumed = await WalletAuthChallenge.findOneAndUpdate(
    {
      _id: challenge._id,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { consumedAt: new Date() } },
    { returnDocument: 'after' },
  );

  return consumed !== null;
};

export {
  consumeSignedWalletChallenge,
  createWalletChallenge,
  getNetworkPassphrase,
  hashWalletMessage,
};
