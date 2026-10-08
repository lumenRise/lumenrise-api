import { stringify } from 'smol-toml';
import type { RequestHandler } from 'express';
import { Networks } from '@stellar/stellar-sdk';

import env from '../env';
import log from '../logger';
import Launch from '../models/Launch';
import AssetIdentity from '../models/AssetIdentity';
import parseDomain from '../services/homeDomain/parseDomain';
import HomeDomainVerification from '../models/HomeDomainVerification';

const getManagedStellarTomlRoute: RequestHandler = async (req, res) => {
  const host = parseDomain((req.get('host') ?? '').split(':')[0] ?? '');
  const testnetDomain = parseDomain(env.STELLAR_TESTNET_HOME_DOMAIN);
  const publicDomain = parseDomain(env.STELLAR_PUBLIC_HOME_DOMAIN);
  const network =
    host && host === testnetDomain ? 'testnet' : host && host === publicDomain ? 'public' : null;

  if (!network) {
    return res.status(404).send('Not found');
  }

  try {
    const validAfter = new Date(Date.now() - 60 * 60 * 1000);

    const verifications = await HomeDomainVerification.find({
      network,
      claimedDomain: host,
      checkedAt: { $gte: validAfter },
    }).lean();

    const issuers = verifications.map((item) => item.issuer);

    const assets = await AssetIdentity.find({
      network,
      issuer: { $in: issuers },
      status: 'verified',
    }).lean();

    const launches = await Launch.find({
      network,
      asset: { $in: assets.map((asset) => asset.assetContractId) },
    })
      .sort({ asOfLedger: -1 })
      .select('asset metadata.logo')
      .lean();

    const images = new Map<string, string>();

    for (const launch of launches) {
      const logo = launch.metadata?.logo;

      if (images.has(launch.asset) || !logo) {
        continue;
      }

      try {
        const url = new URL(logo);

        if (
          url.protocol === 'https:' &&
          url.username === '' &&
          url.password === '' &&
          url.pathname.toLowerCase().endsWith('.png')
        ) {
          images.set(launch.asset, logo);
        }
      } catch {
        // A malformed launch logo is omitted from SEP-1 metadata.
      }
    }
    const byIssuer = new Map(verifications.map((item) => [item.issuer, item]));

    const currencies = assets
      .filter(
        (asset) =>
          asset.assetCode &&
          asset.issuer &&
          byIssuer.get(asset.issuer)?.publishedAssets.includes(asset.assetCode),
      )
      .map((asset) => ({
        code: asset.assetCode!,
        issuer: asset.issuer!,
        ...(images.has(asset.assetContractId) ? { image: images.get(asset.assetContractId)! } : {}),
      }));

    currencies.sort((a, b) => a.code.localeCompare(b.code) || a.issuer.localeCompare(b.issuer));

    const body = stringify({
      NETWORK_PASSPHRASE: network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC,
      DOCUMENTATION: { ORG_NAME: 'Lumenrise', ORG_URL: `https://${host}` },
      CURRENCIES: currencies,
    });

    return res
      .status(200)
      .set('Content-Type', 'text/plain; charset=utf-8')
      .set('Access-Control-Allow-Origin', '*')
      .set('Cross-Origin-Resource-Policy', 'cross-origin')
      .set('Vary', 'Host')
      .set('Cache-Control', 'public, max-age=300')
      .send(body);
  } catch (error) {
    log.error({ error }, 'Managed stellar.toml generation failed');

    return res.status(503).send('Temporarily unavailable');
  }
};

export default getManagedStellarTomlRoute;
