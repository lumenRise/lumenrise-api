import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';

import statsRoutes from '../src/routes/stats/index';
import resolveChain from '../src/middleware/resolveChain';
import resolveNetwork from '../src/middleware/resolveNetwork';
import getMarketStats from '../src/services/stats/getMarketStats';

vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));

vi.mock('../src/services/stats/getMarketStats', () => ({ default: vi.fn() }));

const app = express();

app.use(resolveChain);
app.use(resolveNetwork);
app.use('/v1/stats', statsRoutes);

it('serves every scope independently of valid chain/network headers and handles failures', async (): Promise<void> => {
  vi.mocked(getMarketStats).mockResolvedValue({ chains: [], combined: [] } as never);

  for (const chain of ['stellar', 'base']) {
    const header = chain === 'base' ? 'X-Network' : 'X-Stellar-Network';

    const response = await request(app)
      .get('/v1/stats/market')
      .set('X-Chain', chain)
      .set(header, 'public');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual({ chains: [], combined: [] });
    expect(response.headers['cache-control']).toBe('public, max-age=10');
    expect(getMarketStats).toHaveBeenLastCalledWith(expect.any(Date));
  }

  vi.mocked(getMarketStats).mockRejectedValue(new Error('Invalid stored trade'));

  const unavailable = await request(app).get('/v1/stats/market');

  expect(unavailable.status).toBe(503);
  expect(unavailable.body.result).toEqual({});
  expect(unavailable.headers['cache-control']).toBeUndefined();
});
