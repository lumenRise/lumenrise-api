import env from '../../../../env';

const requestAuthProvider = async (path: string, body?: object): Promise<unknown> => {
  if (!env.AUTH_PROVIDER_API_URL || !env.AUTH_PROVIDER_APP_ID || !env.AUTH_PROVIDER_APP_SECRET) {
    throw new Error('Auth provider is not configured');
  }

  const response = await fetch(`${env.AUTH_PROVIDER_API_URL.replace(/\/$/, '')}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      authorization: `Basic ${Buffer.from(`${env.AUTH_PROVIDER_APP_ID}:${env.AUTH_PROVIDER_APP_SECRET}`).toString('base64')}`,
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15_000),
    redirect: 'error',
  });

  if (response.status === 404 && !body) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Auth provider request failed (${response.status})`);
  }

  const payload: unknown = await response.json();

  if (!payload || typeof payload !== 'object' || !('result' in payload)) {
    throw new Error('Invalid Auth provider response');
  }

  return payload.result;
};

export { requestAuthProvider };
