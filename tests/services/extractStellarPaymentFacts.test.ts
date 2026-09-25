import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';

import createPage from '../utils/stellarActivityScan/createPage.js';
import createOperation from '../utils/stellarActivityScan/createOperation.js';
import extractStellarPaymentFacts from '../../src/utils/sybil/extractStellarPaymentFacts.js';

const address = Keypair.random().publicKey();
const counterparty = Keypair.random().publicKey();
const stranger = Keypair.random().publicKey();
const scanId = new Types.ObjectId();
const identityId = new Types.ObjectId();
const scan = {
  _id: scanId,
  identity: identityId,
  address,
  sourceUrl: 'https://horizon-testnet.stellar.org',
} as never;

describe('Stellar payment network facts', () => {
  it('records only valid incoming and outgoing payments involving the scanned address', () => {
    const outgoing = {
      ...createOperation('5', 'outgoing', '2026-09-25T12:00:00Z'),
      details: { from: address, to: counterparty },
    };
    const incoming = {
      ...createOperation('4', 'incoming', '2026-09-25T11:00:00Z'),
      details: { from: counterparty, to: address },
    };
    const self = {
      ...createOperation('3', 'self', '2026-09-25T10:00:00Z'),
      details: { from: address, to: address },
    };
    const unrelated = {
      ...createOperation('2', 'unrelated', '2026-09-25T09:00:00Z'),
      details: { from: counterparty, to: stranger },
    };
    const invalid = {
      ...createOperation('1', 'invalid', '2026-09-25T08:00:00Z'),
      details: { from: address, to: 'invalid' },
    };
    const nonPayment = { ...outgoing, type: 'create_account', pagingToken: '0' };
    const page = createPage([outgoing, incoming, self, unrelated, invalid, nonPayment], null);

    const facts = extractStellarPaymentFacts(scan, page);

    expect(facts).toHaveLength(2);
    expect(facts[0]).toMatchObject({
      scan: scanId,
      requestedByIdentity: identityId,
      address,
      counterparty,
      operationId: '5',
      direction: 'outgoing',
    });
    expect(facts[1]).toMatchObject({
      operationId: '4',
      direction: 'incoming',
      counterparty,
    });
  });
});
