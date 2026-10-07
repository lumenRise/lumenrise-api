import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import Launch from '../../models/Launch';
import AssetIdentity from '../../models/AssetIdentity';
import StellarAccount from '../../models/StellarAccount';
import parseHomeDomainQuery from './parseHomeDomainQuery';
import HomeDomainVerification from '../../models/HomeDomainVerification';
import getLaunchHomeDomain from '../../services/homeDomain/getLaunchHomeDomain';
import refreshIssuerDomain from '../../services/homeDomain/refreshIssuerDomain';

const refreshLaunchHomeDomainRoute: RequestHandler = async (req, res) => {
  const network = req.query.network ?? env.STELLAR_AUTH_NETWORK;
  const contractId = req.params.contractId;

  if (!parseHomeDomainQuery(network, contractId)) {
    return res.status(400).json({ status: 'error', message: 'Invalid launch query', result: {} });
  }

  try {
    const launch = await Launch.findOne({ network, contractId }).lean();

    if (!launch) {
      return res.status(404).json({ status: 'error', message: 'Launch not found', result: {} });
    }

    const asset = await AssetIdentity.findOne({ network, assetContractId: launch.asset, status: 'verified' }).lean();

    if (!asset?.issuer) {
      return res.status(409).json({ status: 'error', message: 'Asset issuer is not verified', result: {} });
    }

    const wallet = await StellarAccount.exists({
      identity: req.auth!.identityId,
      address: { $in: [launch.owner, asset.issuer] },
      disconnectedAt: null,
    });

    if (!wallet) {
      return res.status(403).json({ status: 'error', message: 'Launch owner or issuer wallet required', result: {} });
    }

    const previous = await HomeDomainVerification.findOne({ network, issuer: asset.issuer }).lean();

    if (previous && Date.now() - previous.checkedAt.getTime() < 5 * 60 * 1000) {
      const retryAfter = Math.ceil((previous.checkedAt.getTime() + 5 * 60 * 1000 - Date.now()) / 1000);

      return res.status(429).set('Retry-After', String(retryAfter))
        .json({ status: 'error', message: 'Home Domain was checked recently', result: {} });
    }

    await refreshIssuerDomain(network as 'testnet' | 'public', asset.issuer);
    const result = await getLaunchHomeDomain(launch);

    return res.status(200).json({ status: 'success', message: 'Home Domain refreshed', result });
  } catch (error) {
    log.error({ error }, 'Home Domain refresh failed');

    return res.status(503).json({ status: 'error', message: 'Home Domain refresh is unavailable', result: {} });
  }
};

export default refreshLaunchHomeDomainRoute;
