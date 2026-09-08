interface GitHubOAuthStartResult {
  authorizationUrl: string;
}

interface GitHubAuthorizationFlow extends GitHubOAuthStartResult {
  state: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  html_url: string;
  avatar_url: string;
  created_at: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
}

interface CompletedGitHubOAuth {
  identityId: string;
  username: string;
}

interface ConnectedGitHubAccount {
  identityId: Types.ObjectId;
  externalAccountId: Types.ObjectId;
}

type GitHubOAuthPurpose = 'register' | 'connect';
type GitHubOAuthResultStatus = 'success' | 'error';

export type {
  CompletedGitHubOAuth,
  ConnectedGitHubAccount,
  GitHubAuthorizationFlow,
  GitHubOAuthPurpose,
  GitHubOAuthResultStatus,
  GitHubOAuthStartResult,
  GitHubTokenResponse,
  GitHubUser,
};
import type { Types } from 'mongoose';
