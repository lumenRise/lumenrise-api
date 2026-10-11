import { vi } from 'vitest';

const createMarketResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
});

export default createMarketResponse;
