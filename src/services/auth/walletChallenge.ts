import { Types } from 'mongoose';
import { createHash, randomBytes } from 'node:crypto';
import {
  Account,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

import env from '../../env.js';
import WalletAuthChallenge from '../../models/WalletAuthChallenge.js';
import type { WalletAuthChallengeResult, WalletAuthPurpose } from '../../types/auth/wallet.js';

const CHALLENGE_TTL_MS = 5 * 60_000;
const hashName = (name: string): string => createHash('sha256').update(name).digest('hex');
const getNetworkPassphrase = (): string =>
  env.STELLAR_AUTH_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET;
const createWalletChallenge = async (
  address: string,
  purpose: WalletAuthPurpose,
  name: string | null = null,
): Promise<WalletAuthChallengeResult> => {
  const challengeId = new Types.ObjectId();
  const nonce = randomBytes(24).toString('base64url');
  const transaction = new TransactionBuilder(new Account(address, '-1'), {
    fee: '100',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(Operation.manageData({ name: 'lumenrise_auth_v1', value: nonce }))
    .setTimeout(0)
    .build();
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

  await WalletAuthChallenge.create({
    _id: challengeId,
    address,
    purpose,
    nameHash: name === null ? null : hashName(name),
    transactionHash: Buffer.from(transaction.hash()).toString('hex'),
    expiresAt,
  });

  return {
    challengeId: challengeId.toString(),
    address,
    purpose,
    unsignedTransaction: transaction.toXDR(),
    networkPassphrase: getNetworkPassphrase(),
    expiresAt: expiresAt.toISOString(),
  };
};
const consumeSignedWalletChallenge = async (
  challengeId: string,
  address: string,
  purpose: WalletAuthPurpose,
  signedTransaction: string,
  name: string | null = null,
): Promise<boolean> => {
  if (!Types.ObjectId.isValid(challengeId) || signedTransaction.length > 10_000) {
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
    const transaction = TransactionBuilder.fromXDR(signedTransaction, getNetworkPassphrase());

    if (
      !(transaction instanceof Transaction) ||
      transaction.source !== address ||
      Buffer.from(transaction.hash()).toString('hex') !== challenge.transactionHash ||
      !transaction.signatures.some((signature) =>
        Keypair.fromPublicKey(address).verify(transaction.hash(), signature.signature),
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

export { consumeSignedWalletChallenge, createWalletChallenge, getNetworkPassphrase };
