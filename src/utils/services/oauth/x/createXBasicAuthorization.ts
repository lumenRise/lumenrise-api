import env from '../../../../env.js';

const createXBasicAuthorization = (): string => {
  const clientId = encodeURIComponent(env.X_CLIENT_ID);
  const clientSecret = encodeURIComponent(env.X_CLIENT_SECRET);

  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
};

export { createXBasicAuthorization };
