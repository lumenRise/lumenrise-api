import request from 'supertest';
import { Types } from 'mongoose';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../src/app.js';
import getSybilEvidence from '../src/services/sybil/getSybilEvidence.js';

const identityId = new Types.ObjectId();

vi.mock('../src/middleware/requireSession.js', () => ({
  default: (req: object, _res: unknown, next: () => void) => {
    Object.assign(req, { auth: { identityId } });
    next();
  },
}));
vi.mock('../src/services/sybil/getSybilEvidence.js', () => ({ default: vi.fn() }));

describe('Sybil evidence route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns diagnostic observations for the authenticated identity', async () => {
    const evidence = {
      identityId: identityId.toString(),
      algorithmVersion: 'sybil-evidence-v2',
      assessment: 'not_assessed',
      corroboration: {
        algorithmVersion: 'activity-corroboration-v1',
        status: 'insufficient_data',
        score: null,
        missingSources: ['github', 'gitlab', 'stellar'],
        signals: [],
      },
      generatedAt: new Date().toISOString(),
      observations: [],
      limitations: [],
    };

    vi.mocked(getSybilEvidence).mockResolvedValue(evidence as never);

    const response = await request(app).get('/v1/reputation/sybil/evidence');

    expect(response.status).toBe(200);
    expect(response.body.result).toEqual(evidence);
    expect(getSybilEvidence).toHaveBeenCalledWith(identityId);
  });

  it('returns 404 for a missing identity', async () => {
    vi.mocked(getSybilEvidence).mockResolvedValue(null);

    const response = await request(app).get('/v1/reputation/sybil/evidence');

    expect(response.status).toBe(404);
  });

  it('returns 503 when evidence retrieval fails', async () => {
    vi.mocked(getSybilEvidence).mockRejectedValue(new Error('Database unavailable'));

    const response = await request(app).get('/v1/reputation/sybil/evidence');

    expect(response.status).toBe(503);
  });
});
