import type { Types } from 'mongoose';

import type { ExternalAccountDocument } from './model.js';

interface GitLabOAuthStartResult {
  authorizationUrl: string;
}

interface GitLabAuthorizationFlow extends GitLabOAuthStartResult {
  state: string;
}

interface GitLabTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  created_at?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GitLabUser {
  id: number;
  username: string;
  name: string | null;
  web_url: string;
  avatar_url: string | null;
  created_at: string;
  state?: string;
  bot?: boolean;
  followers?: number;
  following?: number;
  last_activity_on?: string | null;
}

interface CompletedGitLabOAuth {
  identityId: string;
  username: string;
  syncJobId: string;
}

interface ConnectedGitLabAccount {
  identityId: Types.ObjectId;
  externalAccount: ExternalAccountDocument;
}

type GitLabOAuthPurpose = 'register' | 'connect';
type GitLabOAuthResultStatus = 'success' | 'error';

export type {
  CompletedGitLabOAuth,
  ConnectedGitLabAccount,
  GitLabAuthorizationFlow,
  GitLabOAuthPurpose,
  GitLabOAuthResultStatus,
  GitLabOAuthStartResult,
  GitLabTokenResponse,
  GitLabUser,
};
