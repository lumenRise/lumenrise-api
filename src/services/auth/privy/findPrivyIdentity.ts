import Identity from '../../../models/Identity';
import PrivyIdentity from '../../../models/PrivyIdentity';
import type { IdentityDocument } from '../../../types/identity/model';

const findPrivyIdentity = async (userId: string): Promise<IdentityDocument | null> => {
  const mapping = await PrivyIdentity.findOne({ userId }).lean();

  if (!mapping) {
    return null;
  }

  return Identity.findById(mapping.identity).select('_id status name avatarUrl');
};

export default findPrivyIdentity;
