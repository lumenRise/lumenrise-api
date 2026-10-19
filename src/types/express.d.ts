import type { Types } from 'mongoose';

import type { AuthContext } from './auth/model';
import type { StellarNetwork } from './network/configuration';

declare global {
  namespace Express {
    interface Request {
      network: StellarNetwork;
      auth?: AuthContext;
      developerIdentityId?: Types.ObjectId;
    }
  }
}

export {};
