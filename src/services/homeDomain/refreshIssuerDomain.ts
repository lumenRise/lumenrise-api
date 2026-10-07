import { parse } from 'smol-toml';
import { Networks } from '@stellar/stellar-sdk';

import env from '../../env';
import fetchStellarToml from './fetchStellarToml';
import verifyIssuerDomain from './verifyIssuerDomain';
import HomeDomainCheck from '../../models/HomeDomainCheck';
import type { StellarNetwork } from '../../types/homeDomain/network';
import HomeDomainVerification from '../../models/HomeDomainVerification';

const refreshIssuerDomain = async (network: StellarNetwork, issuer: string) => {
  const verification = await verifyIssuerDomain(network, issuer);

  await HomeDomainVerification.updateOne(
    { network, issuer },
    { $set: verification },
    { upsert: true },
  );

  if (
    verification.status !== 'pending' ||
    verification.publishedAssets.length === 0 ||
    env.NODE_ENV !== 'production' ||
    !verification.claimedDomain
  ) {
    await HomeDomainCheck.create(verification);
    return verification;
  }

  try {
    const toml = parse(await fetchStellarToml(verification.claimedDomain));
    const expectedPassphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;
    const currencies = Array.isArray(toml.CURRENCIES) ? toml.CURRENCIES : [];
    const published = verification.publishedAssets.every((code) =>
      currencies.some(
        (currency) =>
          currency !== null &&
          typeof currency === 'object' &&
          'code' in currency &&
          currency.code === code &&
          'issuer' in currency &&
          currency.issuer === issuer,
      ),
    );

    verification.status =
      toml.NETWORK_PASSPHRASE === expectedPassphrase && published ? 'verified' : 'mismatch';
    verification.reason =
      verification.status === 'verified'
        ? null
        : 'Managed stellar.toml does not match issuer assets';
  } catch {
    verification.status = 'unavailable';
    verification.reason = 'Managed stellar.toml is not publicly reachable yet';
  }

  await HomeDomainVerification.updateOne({ network, issuer }, { $set: verification });
  await HomeDomainCheck.create(verification);

  return verification;
};

export default refreshIssuerDomain;
