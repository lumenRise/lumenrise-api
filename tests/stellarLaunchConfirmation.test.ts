import express from 'express';
import request from 'supertest';
import { StrKey } from '@stellar/stellar-sdk';
import { beforeEach, expect, it, vi } from 'vitest';

import resolveChain from '../src/middleware/resolveChain';
import resolveNetwork from '../src/middleware/resolveNetwork';
import getLaunchRpc from '../src/services/launch/getLaunchRpc';
import postConfirmation from '../src/routes/launches/postConfirmation';
import getNetworkConfig from '../src/services/network/getNetworkConfig';
import recordStellarLaunch from '../src/services/launch/recordStellarLaunch';
import createStellarLaunchTransaction from './helpers/createStellarLaunchTransaction';

vi.mock('../src/logger', () => ({ default: { warn: vi.fn() } }));
vi.mock('../src/routes/launches/postBaseConfirmation', () => ({ default: vi.fn() }));
vi.mock('../src/services/launch/getLaunchRpc', () => ({ default: vi.fn() }));
vi.mock('../src/services/network/getNetworkConfig', () => ({ default: vi.fn() }));
vi.mock('../src/services/launch/recordStellarLaunch', () => ({ default: vi.fn() }));
vi.mock('../src/utils/launch/toLaunchResult', () => ({ default: (launch: unknown) => launch }));

const app = express();
const factory = StrKey.encodeContract(Buffer.alloc(32, 1));
const child = StrKey.encodeContract(Buffer.alloc(32, 2));
const hash = 'a'.repeat(64);
const server = { getTransaction: vi.fn() };

app.use(express.json());
app.use(resolveChain);
app.use(resolveNetwork);
app.post('/confirm', postConfirmation);

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(getLaunchRpc).mockResolvedValue(server as never);
  vi.mocked(getNetworkConfig).mockReturnValue({ factoryContractId: factory } as never);
  server.getTransaction.mockResolvedValue(createStellarLaunchTransaction(factory, child));
  vi.mocked(recordStellarLaunch).mockResolvedValue({
    contractId: child,
    slug: 'blue-project',
  } as never);
});

it('uses the selected environment and returns the persisted launch slug', async (): Promise<void> => {
  const response = await request(app)
    .post('/confirm?network=public')
    .send({ transactionHash: hash });

  expect(response.status).toBe(200);
  expect(getLaunchRpc).toHaveBeenCalledWith('public');
  expect(recordStellarLaunch).toHaveBeenCalledWith(
    server,
    'public',
    child,
    expect.objectContaining({ txHash: hash }),
  );
  expect(response.body.result.launches[0].slug).toBe('blue-project');
});

it('returns pending for unavailable transactions and rejects failed transactions', async (): Promise<void> => {
  server.getTransaction.mockResolvedValueOnce({ status: 'NOT_FOUND' });

  const pending = await request(app).post('/confirm').send({ transactionHash: hash });

  server.getTransaction.mockResolvedValueOnce({ status: 'FAILED' });

  const failed = await request(app).post('/confirm').send({ transactionHash: hash });

  expect(pending.status).toBe(202);
  expect(pending.headers['retry-after']).toBe('5');
  expect(failed.status).toBe(400);
  expect(recordStellarLaunch).not.toHaveBeenCalled();
});

it('rejects a successful transaction from another factory', async (): Promise<void> => {
  server.getTransaction.mockResolvedValue(createStellarLaunchTransaction(child, factory));

  const response = await request(app).post('/confirm').send({ transactionHash: hash });

  expect(response.status).toBe(400);
  expect(recordStellarLaunch).not.toHaveBeenCalled();
});

it('rejects an RPC response for a different transaction hash', async (): Promise<void> => {
  server.getTransaction.mockResolvedValue({
    ...createStellarLaunchTransaction(factory, child),
    txHash: 'b'.repeat(64),
  });

  const response = await request(app).post('/confirm').send({ transactionHash: hash });

  expect(response.status).toBe(503);
  expect(recordStellarLaunch).not.toHaveBeenCalled();
});
