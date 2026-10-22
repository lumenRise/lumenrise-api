import type { Types } from 'mongoose';

import type { AuthContext } from './auth/model';
import type { MarketIdentity } from './launch/market';
import type { StellarNetwork } from './network/configuration';

declare global {
  namespace Express {
    interface Request {
      network: StellarNetwork;
      launchIdentity?: MarketIdentity;
      launchSlug?: string;
      auth?: AuthContext;
      developerIdentityId?: Types.ObjectId;
    }
  }
}

export {};
