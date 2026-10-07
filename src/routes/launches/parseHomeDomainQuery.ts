import { StrKey } from '@stellar/stellar-sdk';

const parseHomeDomainQuery = (network: unknown, contractId: unknown): network is 'testnet' | 'public' =>
  (network === 'testnet' || network === 'public') &&
  typeof contractId === 'string' && StrKey.isValidContract(contractId);

export default parseHomeDomainQuery;
