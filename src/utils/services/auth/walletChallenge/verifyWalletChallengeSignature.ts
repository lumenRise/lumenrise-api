import { Keypair } from '@stellar/stellar-sdk';

import { hashWalletMessage } from './hashWalletMessage';
import type { WalletAuthChallengeDocument } from '../../../../types/auth/wallet';

const verifyWalletChallengeSignature = (
  challenge: WalletAuthChallengeDocument,
  address: string,
  signatureBytes: Buffer,
): boolean => {
  const keypair = Keypair.fromPublicKey(address);
  const messageHash = Buffer.from(challenge.messageHash, 'hex');

  if (typeof challenge.message === 'string') {
    if (!hashWalletMessage(challenge.message).equals(messageHash)) {
      return false;
    }

    return (
      keypair.verify(messageHash, signatureBytes) ||
      keypair.verify(Buffer.from(challenge.message, 'utf8'), signatureBytes)
    );
  }

  return keypair.verify(messageHash, signatureBytes);
};

export { verifyWalletChallengeSignature };
