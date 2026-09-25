import { createHash } from 'node:crypto';

const hashApiKey = (apiKey: string): string => createHash('sha256').update(apiKey).digest('hex');

export default hashApiKey;
