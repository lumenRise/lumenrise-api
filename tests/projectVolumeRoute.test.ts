import express from 'express';
import request from 'supertest';
import { beforeEach, expect, it, vi } from 'vitest';

import statsRoutes from '../src/routes/stats/index';
import resolveChain from '../src/middleware/resolveChain';
import resolveNetwork from '../src/middleware/resolveNetwork';
import getProjectVolume from '../src/services/stats/getProjectVolume';

vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));

vi.mock('../src/services/stats/getProjectVolume', () => ({ default: vi.fn() }));

const app = express();

app.use(resolveChain);
app.use(resolveNetwork);
app.use('/v1/stats', statsRoutes);

beforeEach((): void => {
  vi.resetAllMocks();

  vi.mocked(getProjectVolume).mockResolvedValue({ currency: 'USDC', multiplier: 2 } as never);
});

it.each(['stellar', 'base'])(
  'returns cross-chain public volume when the selected chain is %s',
  async (chain: string): Promise<void> => {
    const response = await request(app)
      .get('/v1/stats/volume?network=public')
      .set('X-Chain', chain);

    expect(response.status).toBe(200);
    expect(response.body.result).toMatchObject({ currency: 'USDC', multiplier: 2 });
    expect(getProjectVolume).toHaveBeenCalledWith('public', expect.any(Date));
  },
);

it('rejects invalid environments before reading trades', async (): Promise<void> => {
  const response = await request(app).get('/v1/stats/volume?network=mainnet');

  expect(response.status).toBe(400);
  expect(getProjectVolume).not.toHaveBeenCalled();
});

it('returns 503 when stored amounts cannot be read safely', async (): Promise<void> => {
  vi.mocked(getProjectVolume).mockRejectedValue(new Error('Invalid decimals'));

  const response = await request(app).get('/v1/stats/volume?network=testnet');

  expect(response.status).toBe(503);
  expect(response.body.result).toEqual({});
});
