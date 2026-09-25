import type { DeveloperApiKeyDocument, DeveloperApiKeyResult } from '../../types/developer/api.js';

const toApiKeyResult = (key: DeveloperApiKeyDocument): DeveloperApiKeyResult => ({
  id: key._id.toString(),
  label: key.label,
  prefix: key.prefix,
  expiresAt: key.expiresAt.toISOString(),
  revokedAt: key.revokedAt?.toISOString() ?? null,
  createdAt: key.createdAt.toISOString(),
});

export default toApiKeyResult;
