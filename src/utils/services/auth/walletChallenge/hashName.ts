import { createHash } from 'node:crypto';

const hashName = (name: string): string => createHash('sha256').update(name).digest('hex');

export { hashName };
