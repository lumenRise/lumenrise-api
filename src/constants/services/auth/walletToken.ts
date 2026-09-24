import { randomBytes } from 'node:crypto';

const developmentSecret = randomBytes(32).toString('hex');

export { developmentSecret };
