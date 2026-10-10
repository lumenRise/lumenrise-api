import { vi } from 'vitest';
import type { Request, Response } from 'express';

import getManagedStellarTomlRoute from '../../src/routes/managedStellarToml';

const serveStellarToml = async (host: string) => {
  const response = {
    status: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };

  await getManagedStellarTomlRoute(
    { get: () => host } as unknown as Request,
    response as unknown as Response,
    vi.fn(),
  );

  return {
    status: response.status.mock.calls[0]?.[0] as number,
    text: response.send.mock.calls[0]?.[0] as string,
    set: response.set,
  };
};

export default serveStellarToml;
