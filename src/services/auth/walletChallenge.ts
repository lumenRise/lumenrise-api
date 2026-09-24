import { Types } from 'mongoose';
import { Keypair } from '@stellar/stellar-sdk';

import type { WalletAuthPurpose } from '../../types/auth/wallet.js';
import WalletAuthChallenge from '../../models/WalletAuthChallenge.js';
import { hashName } from '../../utils/services/auth/walletChallenge/hashName.js';
import { hashWalletMessage } from '../../utils/services/auth/walletChallenge/hashWalletMessage.js';
import { getNetworkPassphrase } from '../../utils/services/auth/walletChallenge/getNetworkPassphrase.js';
import { createWalletChallenge } from '../../utils/services/auth/walletChallenge/createWalletChallenge.js';
import {
  CHALLENGE_TTL_MS,
  SIGNED_MESSAGE_PREFIX,
} from '../../constants/services/auth/walletChallenge.js';

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

export { SIGNED_MESSAGE_PREFIX, CHALLENGE_TTL_MS };
