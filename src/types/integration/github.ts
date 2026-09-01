interface GitHubOAuthStartResult {
  authorizationUrl: string;
}

interface GitHubAuthorizationFlow extends GitHubOAuthStartResult {
  state: string;
}

interface GitHubTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  html_url: string;
  avatar_url: string;
}

interface CompletedGitHubOAuth {
  identityId: string;
  username: string;
}

type GitHubOAuthPurpose = 'register' | 'connect';
type GitHubOAuthResultStatus = 'success' | 'error';

export type {
  CompletedGitHubOAuth,
  GitHubAuthorizationFlow,
  GitHubOAuthPurpose,
  GitHubOAuthResultStatus,
  GitHubOAuthStartResult,
  GitHubTokenResponse,
  GitHubUser,
};
