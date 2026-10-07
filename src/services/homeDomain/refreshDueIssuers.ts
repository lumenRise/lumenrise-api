import AssetIdentity from '../../models/AssetIdentity';
import refreshIssuerDomain from './refreshIssuerDomain';
import HomeDomainVerification from '../../models/HomeDomainVerification';

const refreshDueIssuers = async (): Promise<number> => {
  const candidates = await AssetIdentity.find({ status: 'verified', issuer: { $ne: null } })
    .select('network issuer')
    .lean();

  const identities = new Map(candidates.map((item) => [`${item.network}:${item.issuer}`, item]));

  if (identities.size === 0) {
    return 0;
  }

  const retryBefore = new Date(Date.now() - 15 * 60 * 1000);

  const verifications = await HomeDomainVerification.find({
    $or: [...identities.values()].map((item) => ({ network: item.network, issuer: item.issuer })),
  })
    .select('network issuer checkedAt')
    .lean();

  const checked = new Map(
    verifications.map((item) => [`${item.network}:${item.issuer}`, item.checkedAt]),
  );

  const due = [...identities]
    .filter(([key]) => !checked.has(key) || checked.get(key)! < retryBefore)
    .slice(0, 10);

  for (const [, identity] of due) {
    await refreshIssuerDomain(identity.network, identity.issuer!);
  }

  return due.length;
};

export default refreshDueIssuers;
