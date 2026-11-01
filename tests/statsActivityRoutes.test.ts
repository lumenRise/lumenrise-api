import express from 'express';
import request from 'supertest';
import { expect, it, vi } from 'vitest';

import statsRoutes from '../src/routes/stats/index';
import resolveChain from '../src/middleware/resolveChain';
import resolveNetwork from '../src/middleware/resolveNetwork';
import getStatsChart from '../src/services/stats/getStatsChart';
import getStatsTrades from '../src/services/stats/getStatsTrades';

vi.mock('../src/logger', () => ({ default: { error: vi.fn() } }));

vi.mock('../src/services/stats/getStatsChart', () => ({ default: vi.fn() }));

vi.mock('../src/services/stats/getStatsTrades', () => ({ default: vi.fn() }));

const app = express();

app.use(resolveChain);
app.use(resolveNetwork);
app.use('/v1/stats', statsRoutes);

it('serves public trade and chart groups, validates requests and reports temporary failures', async (): Promise<void> => {
  vi.mocked(getStatsTrades).mockResolvedValue({
    currency: 'USDC',
    limit: 20,
    chains: [],
    combined: [],
  });

  vi.mocked(getStatsChart).mockResolvedValue({ chains: [], combined: [] } as never);

  for (const chain of ['stellar', 'base']) {
    const header = chain === 'base' ? 'X-Network' : 'X-Stellar-Network';

    const trades = await request(app)
      .get('/v1/stats/trades')
      .set('X-Chain', chain)
      .set(header, 'public');

    expect(trades.status).toBe(200);
    expect(trades.body.result).toMatchObject({ currency: 'USDC', chains: [], combined: [] });
    expect(trades.headers['cache-control']).toBe('public, max-age=5');
    expect(getStatsTrades).toHaveBeenLastCalledWith(
      { limit: 20, cursors: new Map() },
      expect.any(Date),
    );

    const chart = await request(app)
      .get('/v1/stats/chart?interval=week')
      .set('X-Chain', chain)
      .set(header, 'public');

    expect(chart.status).toBe(200);
    expect(chart.headers['cache-control']).toBe('public, max-age=10');
    expect(getStatsChart).toHaveBeenLastCalledWith(
      expect.objectContaining({ interval: 'week' }),
      expect.any(Date),
    );
  }

  vi.mocked(getStatsTrades).mockClear();

  vi.mocked(getStatsChart).mockClear();

  for (const path of [
    '/v1/stats/trades?limit=101',
    '/v1/stats/trades?basePublicCursor=bad',
    '/v1/stats/chart?from=bad',
    '/v1/stats/chart?interval=year',
  ]) {
    const response = await request(app).get(path);

    expect(response.status).toBe(400);
    expect(response.body.result).toEqual({});
  }

  expect(getStatsTrades).not.toHaveBeenCalled();
  expect(getStatsChart).not.toHaveBeenCalled();

  vi.mocked(getStatsTrades).mockRejectedValue(new Error('Database unavailable'));

  vi.mocked(getStatsChart).mockRejectedValue(new Error('Database unavailable'));

  for (const path of ['/v1/stats/trades', '/v1/stats/chart']) {
    const response = await request(app).get(path);

    expect(response.status).toBe(503);
    expect(response.body.status).toBe('error');
    expect(response.body.result).toEqual({});
    expect(response.headers['cache-control']).toBeUndefined();
  }
});
