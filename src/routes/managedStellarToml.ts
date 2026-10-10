import { stringify } from 'smol-toml';
import type { RequestHandler } from 'express';
import { Networks } from '@stellar/stellar-sdk';

import env from '../env';
import log from '../logger';
import Launch from '../models/Launch';
import TokenImage from '../models/TokenImage';
import AssetIdentity from '../models/AssetIdentity';
import parseDomain from '../services/stellar/parseDomain';

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
    const launches = await Launch.find({ network })
      .sort({ factoryIndex: 1 })
      .select('contractId asset metadata')
      .lean();
    const identities = await AssetIdentity.find({
      network,
      assetContractId: { $in: launches.map((launch) => launch.asset) },
      status: 'verified',
    }).lean();
    const images = await TokenImage.find({
      network,
      status: 'finalized',
      assetContractId: { $in: launches.map((launch) => launch.asset) },
    }).lean();
    const byContract = new Map(identities.map((identity) => [identity.assetContractId, identity]));
    const imageByContract = new Map(
      images.map((image) => [image.launchContractId, image.publicUrl]),
    );
    const publishedAssets = new Set<string>();
    const currencies = launches.flatMap((launch) => {
      const identity = byContract.get(launch.asset);

      if (
        !identity?.assetCode ||
        !identity.issuer ||
        identity.assetCode !== launch.metadata.symbol ||
        publishedAssets.has(launch.asset)
      ) {
        return [];
      }

      publishedAssets.add(launch.asset);
      const logo = imageByContract.get(launch.contractId) ?? '';
      let image: string | undefined;

      try {
        const url = new URL(logo);

        if (
          url.protocol === 'https:' &&
          !url.username &&
          !url.password &&
          url.pathname.toLowerCase().endsWith('.png')
        ) {
          image = logo;
        }
      } catch {
        // A malformed image URL is omitted from the published metadata.
      }

      return [
        {
          code: identity.assetCode,
          issuer: identity.issuer,
          ...(launch.metadata.name.length <= 20 ? { name: launch.metadata.name } : {}),
          desc: launch.metadata.description,
          display_decimals: 7,
          is_asset_anchored: false,
          ...(image ? { image } : {}),
        },
      ];
    });

    const body = stringify({
      VERSION: '2.3.0',
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
      .set('Cache-Control', 'no-store')
      .send(body);
  } catch (error) {
    log.error({ error }, 'Managed stellar.toml generation failed');

    return res.status(503).send('Temporarily unavailable');
  }
};

export default getManagedStellarTomlRoute;
