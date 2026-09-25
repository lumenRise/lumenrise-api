import type { Types } from 'mongoose';

import type { AuthContext } from './auth/model.js';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      developerIdentityId?: Types.ObjectId;
    }
  }
}

export {};
