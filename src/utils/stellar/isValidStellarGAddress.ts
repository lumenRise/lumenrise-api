import { StrKey } from '@stellar/stellar-sdk';

const isValidStellarGAddress = (value: string): boolean => {
  return StrKey.isValidEd25519PublicKey(value);
};

export default isValidStellarGAddress;
