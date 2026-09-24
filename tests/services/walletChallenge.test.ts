import { createHash } from 'node:crypto';
import { Keypair } from '@stellar/stellar-sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import WalletAuthChallenge from '../../src/models/WalletAuthChallenge.js';
import {
  consumeSignedWalletChallenge,
  createWalletChallenge,
  hashWalletMessage,
} from '../../src/services/auth/walletChallenge.js';

describe('wallet message challenge', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the SEP-53 canonical message hash', () => {
    const wallet = Keypair.fromSecret('SAKICEVQLYWGSOJS4WW7HZJWAHZVEEBS527LHK5V4MLJALYKICQCJXMW');
    const signature = Buffer.from(wallet.sign(hashWalletMessage('Hello, World!'))).toString(
      'base64',
    );

    expect(signature).toBe(
      'fO5dbYhXUhBMhe6kId/cuVq/AfEnHRHEvsP8vXh03M1uLpi5e46yO2Q8rEBzu3feXQewcQE5GArp88u6ePK6BA==',
    );
  });

  it('accepts a SEP-53 signature exactly once and binds the registration name', async () => {
    const wallet = Keypair.random();

    vi.spyOn(WalletAuthChallenge, 'create').mockResolvedValue({} as never);

    const challenge = await createWalletChallenge(wallet.publicKey(), 'register', 'Alice');
    const signature = Buffer.from(wallet.sign(hashWalletMessage(challenge.message))).toString(
      'base64',
    );
    const stored = {
      _id: challenge.challengeId,
      messageHash: hashWalletMessage(challenge.message).toString('hex'),
    };
    const findChallenge = vi
      .spyOn(WalletAuthChallenge, 'findOne')
      .mockResolvedValue(stored as never);

    vi.spyOn(WalletAuthChallenge, 'findOneAndUpdate')
      .mockResolvedValueOnce(stored as never)
      .mockResolvedValueOnce(null);

    expect(challenge.message).toContain(`Address: ${wallet.publicKey()}`);
    expect(challenge.message).toContain('Purpose: register');
    expect(
      await consumeSignedWalletChallenge(
        challenge.challengeId,
        wallet.publicKey(),
        'register',
        signature,
        'Alice',
      ),
    ).toBe(true);
    expect(
      await consumeSignedWalletChallenge(
        challenge.challengeId,
        wallet.publicKey(),
        'register',
        signature,
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
    const signature = Buffer.from(
      Keypair.random().sign(hashWalletMessage(challenge.message)),
    ).toString('base64');
    const consumed = vi.spyOn(WalletAuthChallenge, 'findOneAndUpdate');

    vi.spyOn(WalletAuthChallenge, 'findOne').mockResolvedValue({
      _id: challenge.challengeId,
      messageHash: hashWalletMessage(challenge.message).toString('hex'),
    } as never);

    expect(
      await consumeSignedWalletChallenge(
        challenge.challengeId,
        wallet.publicKey(),
        'login',
        signature,
      ),
    ).toBe(false);
    expect(consumed).not.toHaveBeenCalled();
  });

  it('rejects a signature for altered message content', async () => {
    const wallet = Keypair.random();

    vi.spyOn(WalletAuthChallenge, 'create').mockResolvedValue({} as never);

    const challenge = await createWalletChallenge(wallet.publicKey(), 'login');
    const signature = Buffer.from(
      wallet.sign(hashWalletMessage(`${challenge.message}\nAltered`)),
    ).toString('base64');

    vi.spyOn(WalletAuthChallenge, 'findOne').mockResolvedValue({
      _id: challenge.challengeId,
      messageHash: hashWalletMessage(challenge.message).toString('hex'),
    } as never);

    expect(
      await consumeSignedWalletChallenge(
        challenge.challengeId,
        wallet.publicKey(),
        'login',
        signature,
      ),
    ).toBe(false);
  });

  it('rejects expired challenges before checking the signature', async () => {
    const wallet = Keypair.random();

    vi.spyOn(WalletAuthChallenge, 'findOne').mockResolvedValue(null);

    const consume = vi.spyOn(WalletAuthChallenge, 'findOneAndUpdate');
    const signature = Buffer.alloc(64).toString('base64');

    expect(
      await consumeSignedWalletChallenge(
        '507f1f77bcf86cd799439011',
        wallet.publicKey(),
        'login',
        signature,
      ),
    ).toBe(false);
    expect(consume).not.toHaveBeenCalled();
  });
});
