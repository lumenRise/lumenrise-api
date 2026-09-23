import type { Types } from 'mongoose';

import type { ExternalAccountDocument } from './model.js';

interface XOAuthStartResult {
  authorizationUrl: string;
}

interface XAuthorizationFlow extends XOAuthStartResult {
  state: string;
}

interface XTokenResponse {
  token_type?: string;
  expires_in?: number;
  access_token?: string;
  scope?: string;
  refresh_token?: string;
  error?: string;
  error_description?: string;
}

interface XPublicMetrics {
  followers_count: number;
  following_count: number;
  tweet_count: number;
  listed_count: number;
  like_count?: number;
  media_count?: number;
}

interface XUser {
  id: string;
  name: string;
  username: string;
  created_at?: string;
  description?: string;
  location?: string;
  profile_image_url?: string;
  protected?: boolean;
  public_metrics?: XPublicMetrics;
  url?: string;
  verified?: boolean;
  verified_type?: string;
  is_identity_verified?: boolean;
}

interface XUserResponse {
  data?: XUser;
  errors?: Array<{ detail?: string; title?: string }>;
}

interface CompletedXOAuth {
  identityId: string;
  username: string;
}

interface ConnectedXAccount {
  identityId: Types.ObjectId;
  externalAccount: ExternalAccountDocument;
}

type XOAuthPurpose = 'register' | 'connect';
type XOAuthResultStatus = 'success' | 'error';

export type {
  CompletedXOAuth,
  ConnectedXAccount,
  XAuthorizationFlow,
  XOAuthPurpose,
  XOAuthResultStatus,
  XOAuthStartResult,
  XPublicMetrics,
  XTokenResponse,
  XUser,
  XUserResponse,
};
