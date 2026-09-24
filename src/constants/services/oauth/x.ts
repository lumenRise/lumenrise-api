const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';
const OAUTH_STATE_TTL_MS = 600_000;
const X_AUTHENTICATED_USER_URL =
  'https://api.x.com/2/users/me?user.fields=created_at,description,is_identity_verified,location,profile_image_url,protected,public_metrics,url,verified,verified_type';
const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const X_REVOKE_URL = 'https://api.x.com/2/oauth2/revoke';

export { X_AUTHORIZE_URL, OAUTH_STATE_TTL_MS, X_AUTHENTICATED_USER_URL, X_TOKEN_URL, X_REVOKE_URL };
