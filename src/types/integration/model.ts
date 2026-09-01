import type { HydratedDocument, Types } from 'mongoose';

type ExternalAccountProvider = 'github' | 'gitlab' | 'x';
type ExternalAccountStatus = 'connected' | 'disconnected';
type OAuthPurpose = 'register' | 'connect';

interface ExternalAccountRecord {
  identity: Types.ObjectId;
  provider: ExternalAccountProvider;
  providerAccountId: string;
  username: string;
  displayName: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  status: ExternalAccountStatus;
  connectedAt: Date;
  lastSyncedAt: Date | null;
  disconnectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface OAuthStateRecord {
  identity: Types.ObjectId | null;
  provider: ExternalAccountProvider;
  purpose: OAuthPurpose;
  stateHash: string;
  codeChallenge: string;
  codeVerifier: string;
  redirectUri: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

type ExternalAccountDocument = HydratedDocument<ExternalAccountRecord>;
type OAuthStateDocument = HydratedDocument<OAuthStateRecord>;

export type {
  ExternalAccountDocument,
  ExternalAccountProvider,
  ExternalAccountRecord,
  ExternalAccountStatus,
  OAuthPurpose,
  OAuthStateDocument,
  OAuthStateRecord,
};
