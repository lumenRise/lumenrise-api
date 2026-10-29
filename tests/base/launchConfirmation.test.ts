import express from 'express';
import request from 'supertest';
import { beforeEach, expect, it, vi } from 'vitest';

import Launch from '../../src/models/Launch';
import createBaseLog from '../helpers/createBaseLog';
import resolveChain from '../../src/middleware/resolveChain';
import resolveNetwork from '../../src/middleware/resolveNetwork';
import getBaseContext from '../../src/services/base/getBaseContext';
import type { BaseWriteContext } from '../../src/types/base/launch';
import createBaseCreationLog from '../helpers/createBaseCreationLog';
import acquireBaseLease from '../../src/services/base/acquireBaseLease';
import releaseBaseLease from '../../src/services/base/releaseBaseLease';
import processBaseBlock from '../../src/services/base/processBaseBlock';
import postConfirmation from '../../src/routes/launches/postConfirmation';

vi.mock('../../src/logger', () => ({ default: { warn: vi.fn() } }));
vi.mock('../../src/models/Launch', () => ({ default: { find: vi.fn() } }));
vi.mock('../../src/utils/launch/toLaunchResult', () => ({ default: (launch: unknown) => launch }));
vi.mock('../../src/routes/launches/postStellarConfirmation', () => ({ default: vi.fn() }));
vi.mock('../../src/services/base/getBaseContext', () => ({ default: vi.fn() }));
vi.mock('../../src/services/base/acquireBaseLease', () => ({ default: vi.fn() }));
vi.mock('../../src/services/base/releaseBaseLease', () => ({ default: vi.fn() }));
vi.mock('../../src/services/base/processBaseBlock', () => ({ default: vi.fn() }));
vi.mock('../../src/services/base/reconcileBaseChain', () => ({ default: vi.fn() }));

const app = express();
const creation = createBaseCreationLog();
const trade = createBaseLog();
const hash = creation.transactionHash!;

const context = {
  configuration: { network: 'testnet', factoryAddress: creation.address },
  leaseOwner: 'confirmation',
  client: { getTransactionReceipt: vi.fn(), getBlock: vi.fn() },
} as unknown as BaseWriteContext;

app.use(express.json());
app.use(resolveChain);
app.use(resolveNetwork);
app.post('/confirm', postConfirmation);

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(getBaseContext).mockResolvedValue(context);
  vi.mocked(acquireBaseLease).mockResolvedValue(context);

  vi.mocked(context.client.getTransactionReceipt).mockResolvedValue({
    status: 'success',
    transactionHash: hash,
    blockNumber: 20n,
    blockHash: creation.blockHash,
    logs: [creation, trade],
  } as never);

  vi.mocked(context.client.getBlock).mockResolvedValue({
    number: 20n,
    hash: creation.blockHash,
    timestamp: 100n,
  } as never);

  vi.mocked(Launch.find).mockReturnValue({
    lean: async () => [{ contractId: trade.address, slug: 'blue-project' }],
  } as never);
});

it('confirms launch and first trade together without advancing the event scanner cursor', async (): Promise<void> => {
  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(200);
  expect(response.body.result.launches[0].slug).toBe('blue-project');
  expect(processBaseBlock).toHaveBeenCalledWith(
    expect.objectContaining({ logs: [creation, trade] }),
  );
  expect(vi.mocked(processBaseBlock).mock.calls[0]![0].advance).toBeUndefined();
  expect(releaseBaseLease).toHaveBeenCalledWith(context);
});

it('asks the client to retry the same hash when the scanner owns the lease', async (): Promise<void> => {
  vi.mocked(acquireBaseLease).mockResolvedValue(null);

  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(202);
  expect(response.headers['retry-after']).toBe('2');
  expect(processBaseBlock).not.toHaveBeenCalled();
});

it('does not index token deployment or unrelated trade receipts as a factory launch', async (): Promise<void> => {
  vi.mocked(context.client.getTransactionReceipt).mockResolvedValue({
    status: 'success',
    transactionHash: hash,
    logs: [trade],
  } as never);

  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(400);
  expect(acquireBaseLease).not.toHaveBeenCalled();
});

it('returns pending while a receipt is unavailable', async (): Promise<void> => {
  const error = new Error('Not mined');

  error.name = 'TransactionReceiptNotFoundError';

  vi.mocked(context.client.getTransactionReceipt).mockRejectedValue(error);

  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(202);
});

it('releases the shared lease after an ingestion failure', async (): Promise<void> => {
  vi.mocked(processBaseBlock).mockRejectedValue(new Error('Retry'));

  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(503);
  expect(releaseBaseLease).toHaveBeenCalledWith(context);
});

it('rejects malformed hashes and conflicting network data before contacting RPC', async (): Promise<void> => {
  const invalid = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: 'invalid' });
  const conflict = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash, network: 'public' });

  expect(invalid.status).toBe(400);
  expect(conflict.status).toBe(400);
  expect(getBaseContext).not.toHaveBeenCalled();
});

it('rejects a receipt whose block is no longer canonical', async (): Promise<void> => {
  vi.mocked(context.client.getBlock).mockResolvedValue({ number: 20n, hash: 'changed' } as never);

  const response = await request(app)
    .post('/confirm')
    .set('X-Chain', 'base')
    .send({ transactionHash: hash });

  expect(response.status).toBe(503);
  expect(processBaseBlock).not.toHaveBeenCalled();
});
