import type { HydratedDocument, Types } from 'mongoose';

type WalletAuthPurpose = 'register' | 'login';

interface WalletAuthChallengeRecord {
  address: string;
  purpose: WalletAuthPurpose;
  nameHash: string | null;
  messageHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

interface WalletAuthChallengeResult {
  challengeId: string;
  address: string;
  purpose: WalletAuthPurpose;
  message: string;
  networkPassphrase: string;
  expiresAt: string;
}

interface WalletAuthResult {
  identityId: string;
  address: string;
  name: string | null;
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: string;
}

interface IssuedWalletSession {
  token: string;
  expiresAt: Date;
  sessionId: Types.ObjectId;
}

type WalletAuthServiceResult =
  | { ok: true; result: WalletAuthResult }
  | { ok: false; reason: 'invalid_proof' | 'already_registered' | 'account_not_found' };

interface WalletAuthTokenPayload {
  iss: 'lumenrise-api';
  aud: 'lumenrise-client';
  sub: string;
  sid: string;
  iat: number;
  exp: number;
}

type WalletAuthChallengeDocument = HydratedDocument<WalletAuthChallengeRecord>;

export type {
  WalletAuthChallengeDocument,
  WalletAuthChallengeRecord,
  WalletAuthChallengeResult,
  WalletAuthPurpose,
  WalletAuthResult,
  WalletAuthServiceResult,
  WalletAuthTokenPayload,
  IssuedWalletSession,
};
