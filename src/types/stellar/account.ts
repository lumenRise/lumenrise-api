interface StellarHorizonBalance {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
  buying_liabilities?: string;
  selling_liabilities?: string;
  limit?: string;
  is_authorized?: boolean;
}

interface StellarHorizonAccount {
  account_id: string;
  sequence: string;
  subentry_count: number;
  num_sponsoring: number;
  num_sponsored: number;
  last_modified_ledger: number;
  home_domain?: string;
  balances: StellarHorizonBalance[];
  signers: Array<{ key: string; type: string; weight: number }>;
  thresholds: { low_threshold: number; med_threshold: number; high_threshold: number };
}

interface StellarBalanceResult {
  assetType: string;
  assetCode: string | null;
  assetIssuer: string | null;
  balance: string;
  buyingLiabilities: string | null;
  sellingLiabilities: string | null;
  limit: string | null;
  isAuthorized: boolean | null;
}

interface StellarAccountOverviewResult {
  address: string;
  ownershipVerified: false;
  sequence: string;
  subentryCount: number;
  sponsoringCount: number;
  sponsoredCount: number;
  signerCount: number;
  thresholds: { low: number; medium: number; high: number };
  homeDomain: string | null;
  lastModifiedLedger: number;
  balances: StellarBalanceResult[];
  checkedAt: string;
}

export type {
  StellarAccountOverviewResult,
  StellarBalanceResult,
  StellarHorizonAccount,
  StellarHorizonBalance,
};
