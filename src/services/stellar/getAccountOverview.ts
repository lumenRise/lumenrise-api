import env from '../../env.js';
import isValidStellarGAddress from '../../utils/stellar/isValidStellarGAddress.js';
import type {
  StellarAccountOverviewResult,
  StellarHorizonAccount,
} from '../../types/stellar/account.js';

const getStellarAccountOverview = async (
  address: string,
  checkedAt = new Date(),
): Promise<StellarAccountOverviewResult | null> => {
  if (!isValidStellarGAddress(address)) {
    throw new Error('Invalid Stellar account address');
  }

  const url = new URL(`/accounts/${address}`, env.STELLAR_HORIZON_URL);
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Stellar Horizon request failed with status ${response.status}`);
  }

  const account = (await response.json()) as StellarHorizonAccount;

  if (account.account_id !== address || !Array.isArray(account.balances)) {
    throw new Error('Stellar Horizon returned an invalid account response');
  }

  return {
    address,
    ownershipVerified: false,
    sequence: account.sequence,
    subentryCount: account.subentry_count,
    sponsoringCount: account.num_sponsoring,
    sponsoredCount: account.num_sponsored,
    signerCount: account.signers.length,
    thresholds: {
      low: account.thresholds.low_threshold,
      medium: account.thresholds.med_threshold,
      high: account.thresholds.high_threshold,
    },
    homeDomain: account.home_domain ?? null,
    lastModifiedLedger: account.last_modified_ledger,
    balances: account.balances.map((balance) => ({
      assetType: balance.asset_type,
      assetCode: balance.asset_code ?? null,
      assetIssuer: balance.asset_issuer ?? null,
      balance: balance.balance,
      buyingLiabilities: balance.buying_liabilities ?? null,
      sellingLiabilities: balance.selling_liabilities ?? null,
      limit: balance.limit ?? null,
      isAuthorized: balance.is_authorized ?? null,
    })),
    checkedAt: checkedAt.toISOString(),
  };
};

export default getStellarAccountOverview;
