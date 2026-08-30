import type { HydratedDocument, Types } from 'mongoose';

interface SessionRecord {
  identity: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

interface AuthContext {
  sessionId: Types.ObjectId;
  identityId: Types.ObjectId;
}

interface IssuedSession {
  token: string;
  expiresAt: Date;
}

interface SessionResult {
  identityId: string;
  expiresAt: string;
}

type SessionDocument = HydratedDocument<SessionRecord>;

export type { AuthContext, IssuedSession, SessionDocument, SessionRecord, SessionResult };
