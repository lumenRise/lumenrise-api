import applicationRules from '../../constants/applicationRules';
import parseOptionalProjectUrl from './parseOptionalProjectUrl';
import type { ExternalTeamInput } from '../../types/launch/team';

const parseExternalTeamInput = (body: unknown): ExternalTeamInput | null => {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const fields = body as Record<string, unknown>;
  const name = fields.name;
  const role = fields.role;

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    name.trim().length > applicationRules.team.nameMaxLength ||
    typeof role !== 'string' ||
    !role.trim() ||
    role.trim().length > applicationRules.team.roleMaxLength
  ) {
    return null;
  }

  try {
    const xAccount = parseOptionalProjectUrl(fields.xAccount);

    if (!xAccount) {
      return null;
    }

    return { name: name.trim(), role: role.trim(), xAccount };
  } catch {
    return null;
  }
};

export default parseExternalTeamInput;
