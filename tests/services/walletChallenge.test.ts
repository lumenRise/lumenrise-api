import { createHash } from 'node:crypto';
import type { Transaction } from '@stellar/stellar-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk';

import WalletAuthChallenge from '../../src/models/WalletAuthChallenge.js';
import {
  consumeSignedWalletChallenge,
  createWalletChallenge,
} from '../../src/services/auth/walletChallenge.js';

describe('wallet authentication challenge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts a wallet-signed challenge exactly once', async () => {
    const wallet = Keypair.random();

    vi.spyOn(WalletAuthChallenge, 'create').mockResolvedValue({} as never);
    const challenge = await createWalletChallenge(wallet.publicKey(), 'register', 'Alice');
    const transaction = TransactionBuilder.fromXDR(
      challenge.unsignedTransaction,
      challenge.networkPassphrase,
    ) as Transaction;

    transaction.sign(wallet);

    const stored = {
      _id: challenge.challengeId,
      transactionHash: Buffer.from(transaction.hash()).toString('hex'),
    };
    const findChallenge = vi
      .spyOn(WalletAuthChallenge, 'findOne')
      .mockResolvedValue(stored as never);

    vi.spyOn(WalletAuthChallenge, 'findOneAndUpdate')
      .mockResolvedValueOnce(stored as never)
      .mockResolvedValueOnce(null);

    expect(
      await consumeSignedWalletChallenge(
        challenge.challengeId,
        wallet.publicKey(),
        'register',
        transaction.toXDR(),
        'Alice',
      ),
    ).toBe(true);
    expect(
      await consumeSignedWalletChallenge(
        challenge.challengeId,
        wallet.publicKey(),
        'register',
        transaction.toXDR(),
        'Alice',
      ),
    ).toBe(false);
    expect(findChallenge).toHaveBeenCalledWith(
      expect.objectContaining({
        nameHash: createHash('sha256').update('Alice').digest('hex'),
      }),
    );
  });

  it('rejects a signature from another wallet without consuming the challenge', async () => {
    const wallet = Keypair.random();

    vi.spyOn(WalletAuthChallenge, 'create').mockResolvedValue({} as never);
    const challenge = await createWalletChallenge(wallet.publicKey(), 'login');
    const transaction = TransactionBuilder.fromXDR(
      challenge.unsignedTransaction,
      challenge.networkPassphrase,
    ) as Transaction;

    transaction.sign(Keypair.random());

    const consumed = vi.spyOn(WalletAuthChallenge, 'findOneAndUpdate');

    vi.spyOn(WalletAuthChallenge, 'findOne').mockResolvedValue({
      _id: challenge.challengeId,
      transactionHash: Buffer.from(transaction.hash()).toString('hex'),
    } as never);

    expect(
      await consumeSignedWalletChallenge(
        challenge.challengeId,
        wallet.publicKey(),
        'login',
        transaction.toXDR(),
      ),
    ).toBe(false);
    expect(consumed).not.toHaveBeenCalled();
  });

  it('rejects altered transaction content even with a valid wallet signature', async () => {
    const wallet = Keypair.random();

    vi.spyOn(WalletAuthChallenge, 'create').mockResolvedValue({} as never);
    const challenge = await createWalletChallenge(wallet.publicKey(), 'login');
    const original = TransactionBuilder.fromXDR(
      challenge.unsignedTransaction,
      challenge.networkPassphrase,
    ) as Transaction;
    const otherChallenge = await createWalletChallenge(wallet.publicKey(), 'login');
    const altered = TransactionBuilder.fromXDR(
      otherChallenge.unsignedTransaction,
      otherChallenge.networkPassphrase,
    ) as Transaction;

    altered.sign(wallet);

    vi.spyOn(WalletAuthChallenge, 'findOne').mockResolvedValue({
      _id: challenge.challengeId,
      transactionHash: Buffer.from(original.hash()).toString('hex'),
    } as never);

    expect(
      await consumeSignedWalletChallenge(
        challenge.challengeId,
        wallet.publicKey(),
        'login',
        altered.toXDR(),
      ),
    ).toBe(false);
  });

  it('rejects an expired or already consumed challenge', async () => {
    const wallet = Keypair.random();

    vi.spyOn(WalletAuthChallenge, 'findOne').mockResolvedValue(null);
    const consume = vi.spyOn(WalletAuthChallenge, 'findOneAndUpdate');

    expect(
      await consumeSignedWalletChallenge(
        '507f1f77bcf86cd799439011',
        wallet.publicKey(),
        'login',
        'AAAA',
      ),
    ).toBe(false);
    expect(consume).not.toHaveBeenCalled();
  });
});
