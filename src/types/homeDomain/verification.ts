import type { StellarNetwork } from './network';

interface HomeDomainVerificationRecord {
  network: StellarNetwork;
  issuer: string;
  claimedDomain: string | null;
  tomlUrl: string | null;
  status: 'verified' | 'pending' | 'mismatch' | 'unavailable';
  reason: string | null;
  checkedAt: Date;
  accountLedger: number | null;
  publishedAssets: string[];
}

export type { HomeDomainVerificationRecord };
