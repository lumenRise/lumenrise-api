import env from '../../../../env.js';

const assertXConfiguration = (): void => {
  if (!env.X_CLIENT_ID || !env.X_CLIENT_SECRET) {
    throw new Error('X OAuth is not configured');
  }
};

export { assertXConfiguration };
