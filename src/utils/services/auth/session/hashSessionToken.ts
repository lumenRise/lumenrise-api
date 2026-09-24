import { createHash } from 'node:crypto';

const hashSessionToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

export { hashSessionToken };
