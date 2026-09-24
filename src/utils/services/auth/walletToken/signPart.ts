import { createHmac } from 'node:crypto';

import { getSecret } from './getSecret.js';

const signPart = (part: string): Buffer => createHmac('sha256', getSecret()).update(part).digest();

export { signPart };
