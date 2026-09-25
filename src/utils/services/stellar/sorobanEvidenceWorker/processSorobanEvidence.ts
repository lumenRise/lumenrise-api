import { Networks, rpc, StrKey } from '@stellar/stellar-sdk';

import env from '../../../../env.js';
import log from '../../../../logger.js';
import claimSorobanEvidence from './claimSorobanEvidence.js';
import type { SorobanEventEvidence } from '../../../../types/stellar/soroban.js';
import SorobanTransactionEvidence from '../../../../models/SorobanTransactionEvidence.js';

const MAX_ATTEMPTS = 3;

const processSorobanEvidence = async (): Promise<void> => {
  const evidence = await claimSorobanEvidence();
  if (!evidence) {
    return;
  }

  try {
    const server = new rpc.Server(env.STELLAR_RPC_URL, { timeout: 10_000 });
    const expectedNetwork =
      env.STELLAR_AUTH_NETWORK === 'public' ? Networks.PUBLIC : Networks.TESTNET;
    const network = await server.getNetwork();
    if (network.passphrase !== expectedNetwork) {
      throw new Error('Stellar RPC network does not match wallet authentication network');
    }

    const transaction = await server.getTransaction(evidence.transactionHash);
    if (transaction.txHash.toLowerCase() !== evidence.transactionHash.toLowerCase()) {
      throw new Error('Stellar RPC returned a different transaction');
    }

    if (transaction.status === 'NOT_FOUND' && evidence.attempts < MAX_ATTEMPTS) {
      await SorobanTransactionEvidence.updateOne(
        { _id: evidence._id, rpcStatus: 'running', leaseUntil: evidence.leaseUntil },
        {
          $set: {
            rpcStatus: 'queued',
            scheduledAt: new Date(Date.now() + evidence.attempts * 5_000),
            leaseUntil: null,
          },
        },
      );
      return;
    }

    const events: SorobanEventEvidence[] =
      transaction.status === 'NOT_FOUND'
        ? []
        : transaction.events.contractEventsXdr.flatMap((operationEvents, operationIndex) =>
            operationEvents.map((event, eventIndex) => ({
              operationIndex,
              eventIndex,
              contractId: event.contractId
                ? StrKey.encodeContract(Buffer.from(event.contractId.toXdrObject()))
                : null,
              eventXdr: event.toXdr('base64'),
            })),
          );

    await SorobanTransactionEvidence.updateOne(
      { _id: evidence._id, rpcStatus: 'running', leaseUntil: evidence.leaseUntil },
      {
        $set: {
          rpcStatus: transaction.status.toLowerCase(),
          ledger: transaction.status === 'NOT_FOUND' ? null : transaction.ledger,
          envelopeXdr:
            transaction.status === 'NOT_FOUND' ? null : transaction.envelopeXdr.toXdr('base64'),
          resultMetaXdr:
            transaction.status === 'NOT_FOUND' ? null : transaction.resultMetaXdr.toXdr('base64'),
          returnValueXdr:
            transaction.status === 'SUCCESS' && transaction.returnValue
              ? transaction.returnValue.toXdr('base64')
              : null,
          events,
          leaseUntil: null,
        },
      },
      { runValidators: true },
    );
  } catch {
    log.warn({ transactionHash: evidence.transactionHash }, 'Soroban evidence lookup failed');
    await SorobanTransactionEvidence.updateOne(
      { _id: evidence._id, rpcStatus: 'running', leaseUntil: evidence.leaseUntil },
      {
        $set: {
          rpcStatus: evidence.attempts < MAX_ATTEMPTS ? 'queued' : 'unavailable',
          scheduledAt: new Date(Date.now() + evidence.attempts * 5_000),
          leaseUntil: null,
        },
      },
      { runValidators: true },
    );
  }
};

export { processSorobanEvidence };
