import type { IdentityStatus } from '../types/identity/model.js';

const IDENTITY_STATUSES = [
  'active',
  'suspended',
  'deleted',
] as const satisfies readonly IdentityStatus[];

export { IDENTITY_STATUSES };
