import { parse } from 'smol-toml';
import { Networks, StrKey } from '@stellar/stellar-sdk';

import parseDomain from './parseDomain';
import fetchStellarToml from './fetchStellarToml';
import AssetIdentity from '../../models/AssetIdentity';
import checkHorizonNetwork from './checkHorizonNetwork';
import getHomeDomainConfiguration from './configuration';
import type { StellarNetwork } from '../../types/homeDomain/network';
import type { HorizonAccount } from '../../types/homeDomain/horizon';
import type { HomeDomainVerificationRecord } from '../../types/homeDomain/verification';

const verifyIssuerDomain = async (
  network: StellarNetwork,
  issuer: string,
): Promise<HomeDomainVerificationRecord> => {
  if (!StrKey.isValidEd25519PublicKey(issuer)) {
    throw new Error('Invalid issuer address');
  }

  const configuration = getHomeDomainConfiguration(network);
  const checkedAt = new Date();
  const result: HomeDomainVerificationRecord = {
    network,
    issuer,
    claimedDomain: null,
    tomlUrl: null,
    status: 'pending',
    reason: null,
    checkedAt,
    accountLedger: null,
    publishedAssets: [],
  };

  try {
    await checkHorizonNetwork(network);

    const url = new URL(`/accounts/${issuer}`, configuration.horizonUrl);

    if (url.protocol !== 'https:') {
      throw new Error('Horizon URL must use HTTPS');
    }

    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (response.status === 404) {
      return { ...result, reason: 'Issuer account was not found' };
    }

    if (!response.ok) {
      throw new Error(`Horizon account request failed: ${response.status}`);
    }

    const account = (await response.json()) as HorizonAccount;

    if (account.account_id !== issuer) {
      throw new Error('Horizon returned a different issuer');
    }

    result.accountLedger =
      typeof account.last_modified_ledger === 'number' ? account.last_modified_ledger : null;

    if (typeof account.home_domain !== 'string' || account.home_domain.length === 0) {
      return { ...result, reason: 'Issuer has not set home_domain' };
    }

    const domain = parseDomain(account.home_domain);

    if (!domain) {
      return { ...result, status: 'mismatch', reason: 'Issuer home_domain is invalid' };
    }

    result.claimedDomain = domain;
    result.tomlUrl = `https://${domain}/.well-known/stellar.toml`;

    const assets = await AssetIdentity.find({ network, issuer, status: 'verified' }).lean();

    if (assets.length === 0) {
      return { ...result, reason: 'No verified SAC assets found for issuer' };
    }

    if (configuration.managedDomain && domain === parseDomain(configuration.managedDomain)) {
      return {
        ...result,
        status: 'pending',
        reason: 'Managed stellar.toml publication has not been checked yet',
        publishedAssets: assets.map((asset) => asset.assetCode!),
      };
    }

    const tomlText = await fetchStellarToml(domain);
    let toml: Record<string, unknown>;

    try {
      toml = parse(tomlText);
    } catch {
      return { ...result, status: 'mismatch', reason: 'stellar.toml is malformed' };
    }
    const expectedPassphrase = network === 'testnet' ? Networks.TESTNET : Networks.PUBLIC;

    if (toml.NETWORK_PASSPHRASE !== undefined && toml.NETWORK_PASSPHRASE !== expectedPassphrase) {
      return {
        ...result,
        status: 'mismatch',
        reason: 'stellar.toml network passphrase does not match',
      };
    }

    const currencies = Array.isArray(toml.CURRENCIES) ? toml.CURRENCIES : [];
    const publishedAssets = assets
      .filter((asset) =>
        currencies.some(
          (currency) =>
            currency !== null &&
            typeof currency === 'object' &&
            'code' in currency &&
            currency.code === asset.assetCode &&
            'issuer' in currency &&
            currency.issuer === issuer,
        ),
      )
      .map((asset) => asset.assetCode!);

    if (publishedAssets.length === 0) {
      return {
        ...result,
        status: 'mismatch',
        reason: 'No matching code and issuer in stellar.toml',
      };
    }

    return { ...result, status: 'verified', publishedAssets };
  } catch {
    return {
      ...result,
      status: 'unavailable',
      reason: 'Issuer account or stellar.toml is temporarily unavailable',
    };
  }
};

export default verifyIssuerDomain;
