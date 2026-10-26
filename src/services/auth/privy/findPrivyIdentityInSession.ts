import type { ClientSession } from 'mongoose';

import Identity from '../../../models/Identity';
import PrivyIdentity from '../../../models/PrivyIdentity';
import type { IdentityDocument } from '../../../types/identity/model';

const findPrivyIdentityInSession = async (
  userId: string,
  session: ClientSession,
): Promise<IdentityDocument | null> => {
  const mapping = await PrivyIdentity.findOne({ userId }).session(session);

  if (!mapping) {
    return null;
  }

  return Identity.findById(mapping.identity).session(session);
};

export default findPrivyIdentityInSession;
