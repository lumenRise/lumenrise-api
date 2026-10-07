import AssetIdentity from '../../models/AssetIdentity';
import type { LaunchRecord } from '../../types/launch/model';
import HomeDomainVerification from '../../models/HomeDomainVerification';

const getLaunchHomeDomain = async (launch: LaunchRecord) => {
  const identity = await AssetIdentity.findOne({
    network: launch.network,
    assetContractId: launch.asset,
  }).lean();

  if (!identity || identity.status !== 'verified' || !identity.issuer || !identity.assetCode) {
    return {
      status: identity?.status ?? 'pending',
      reason: identity?.reason ?? 'Asset identity has not been verified',
      assetCode: null,
      issuer: null,
      domain: null,
      tomlUrl: null,
      checkedAt: identity?.identityCheckedAt.toISOString() ?? null,
    };
  }

  const verification = await HomeDomainVerification.findOne({
    network: launch.network,
    issuer: identity.issuer,
  }).lean();
  const stale = verification && Date.now() - verification.checkedAt.getTime() > 60 * 60 * 1000;
  const published = verification?.publishedAssets.includes(identity.assetCode) ?? false;

  return {
    status: stale ? 'unavailable' : verification?.status === 'verified' && published ? 'verified' :
      verification?.status === 'verified' ? 'mismatch' : verification?.status ?? 'pending',
    reason: stale ? 'Home Domain verification is stale' : verification?.status === 'verified' && !published ?
      'This asset is absent from the issuer stellar.toml' : verification?.reason ?? null,
    assetCode: identity.assetCode,
    issuer: identity.issuer,
    domain: verification?.claimedDomain ?? null,
    tomlUrl: verification?.tomlUrl ?? null,
    checkedAt: verification?.checkedAt.toISOString() ?? null,
  };
};

export default getLaunchHomeDomain;
