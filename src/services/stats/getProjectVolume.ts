import type { ProjectVolume } from '../../types/stats/volume';
import requestDomainRead from '../messaging/requestDomainRead';

const getProjectVolume = async (
  network: 'testnet' | 'public' | 'all',
  now: Date,
): Promise<ProjectVolume> => {
  return requestDomainRead<ProjectVolume>('launch', 'stats.volume', {
    network,
    now: now.toISOString(),
  });
};

export default getProjectVolume;
