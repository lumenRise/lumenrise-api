import type { Types } from 'mongoose';

interface AuthContext {
  userId?: string;
  identityId: Types.ObjectId;
}

export type { AuthContext };
