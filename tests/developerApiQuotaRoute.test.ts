import request from 'supertest';
import { Types } from 'mongoose';
import { describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import Identity from '../src/models/Identity.js';
import DeveloperApiKey from '../src/models/DeveloperApiKey.js';
import reserveApiUsage from '../src/services/developer/reserveApiUsage.js';

vi.mock('../src/models/Identity.js', () => ({ default: { exists: vi.fn() } }));
vi.mock('../src/models/DeveloperApiKey.js', () => ({ default: { findOne: vi.fn() } }));
vi.mock('../src/services/developer/reserveApiUsage.js', () => ({ default: vi.fn() }));

describe('developer API quota response', () => {
  it('returns 429 with Retry-After without reading a profile', async () => {
    const identity = new Types.ObjectId();

    vi.mocked(DeveloperApiKey.findOne).mockResolvedValue({ identity } as never);
    vi.mocked(Identity.exists).mockResolvedValue({ _id: identity } as never);
    vi.mocked(reserveApiUsage).mockResolvedValue(false);

    const response = await request(app)
      .get('/v1/developers/profile')
      .set('X-API-Key', `lrk_${'a'.repeat(43)}`);

    expect(response.status).toBe(429);
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(Number(response.headers['retry-after'])).toBeLessThanOrEqual(60);
    expect(reserveApiUsage).toHaveBeenCalledWith(identity, expect.any(Date));
  });
});
