import { describe, expect, it } from 'vitest';
import {
  Account,
  Address,
  Asset,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  xdr,
} from '@stellar/stellar-sdk';

import extractSorobanEnvelopeEvidence from '../../src/services/stellar/extractSorobanEnvelopeEvidence.js';

const source = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 1)).publicKey();
const other = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 2)).publicKey();
const feePayer = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 3)).publicKey();
const contract = StrKey.encodeContract(Buffer.alloc(32, 4));
const nestedContract = StrKey.encodeContract(Buffer.alloc(32, 5));

const createTransaction = () => {
  const nested = new xdr.SorobanAuthorizedInvocation({
    function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
      new xdr.InvokeContractArgs({
        contractAddress: Address.fromString(nestedContract).toScAddress(),
        functionName: 'nested',
        args: [],
      }),
    ),
    subInvocations: [],
  });
  const root = new xdr.SorobanAuthorizedInvocation({
    function: xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
      new xdr.InvokeContractArgs({
        contractAddress: Address.fromString(contract).toScAddress(),
        functionName: 'invoke',
        args: [],
      }),
    ),
    subInvocations: [nested],
  });
  const auth = [
    new xdr.SorobanAuthorizationEntry({
      credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
        new xdr.SorobanAddressCredentials({
          address: Address.fromString(other).toScAddress(),
          nonce: 1n,
          signatureExpirationLedger: 100,
          signature: xdr.ScVal.scvVoid(),
        }),
      ),
      rootInvocation: root,
    }),
    new xdr.SorobanAuthorizationEntry({
      credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
      rootInvocation: root,
    }),
    new xdr.SorobanAuthorizationEntry({
      credentials: xdr.SorobanCredentials.sorobanCredentialsAddressWithDelegates(
        new xdr.SorobanAddressCredentialsWithDelegates({
          addressCredentials: new xdr.SorobanAddressCredentials({
            address: Address.fromString(source).toScAddress(),
            nonce: 2n,
            signatureExpirationLedger: 100,
            signature: xdr.ScVal.scvVoid(),
          }),
          delegates: [
            new xdr.SorobanDelegateSignature({
              address: Address.fromString(other).toScAddress(),
              signature: xdr.ScVal.scvVoid(),
              nestedDelegates: [],
            }),
          ],
        }),
      ),
      rootInvocation: root,
    }),
  ];
  return new TransactionBuilder(new Account(source, '0'), {
    fee: '100',
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({ destination: other, asset: Asset.native(), amount: '1' }))
    .addOperation(
      Operation.invokeContractFunction({
        contract,
        function: 'invoke',
        args: [],
        auth,
        source: other,
      }),
    )
    .addOperation(Operation.uploadContractWasm({ wasm: Buffer.from([0, 97, 115, 109]) }))
    .setTimeout(30)
    .build();
};

describe('structured Soroban envelope evidence', () => {
  it('separates effective operation source, explicit source, credentials, nested calls, and non-invoke operations', () => {
    const result = extractSorobanEnvelopeEvidence(createTransaction().toEnvelope().toXdr('base64'));

    expect(result).toMatchObject({
      envelopeType: 'envelopeTypeTx',
      transactionSource: source,
      feeSource: null,
      operations: [
        {
          operationIndex: 1,
          sourceAccount: other,
          explicitSourceAccount: other,
          hostFunctionType: 'hostFunctionTypeInvokeContract',
          contractAddress: contract,
          functionName: 'invoke',
          authorizations: [
            {
              credentialType: 'sorobanCredentialsAddress',
              address: other,
              invocations: [
                { depth: 0, contractAddress: contract, functionName: 'invoke' },
                { depth: 1, contractAddress: nestedContract, functionName: 'nested' },
              ],
            },
            { credentialType: 'sorobanCredentialsSourceAccount', address: null, delegates: [] },
            {
              credentialType: 'sorobanCredentialsAddressWithDelegates',
              address: source,
              delegates: [{ address: other, depth: 0 }],
            },
          ],
        },
        {
          operationIndex: 2,
          sourceAccount: source,
          explicitSourceAccount: null,
          hostFunctionType: 'hostFunctionTypeUploadContractWasm',
          contractAddress: null,
          functionName: null,
          authorizations: [],
        },
      ],
    });
  });

  it('reads the inner transaction of fee bumps without conflating the fee payer with the operation source', () => {
    const bumped = TransactionBuilder.buildFeeBumpTransaction(
      feePayer,
      '200',
      createTransaction(),
      Networks.TESTNET,
    );
    const result = extractSorobanEnvelopeEvidence(bumped.toEnvelope().toXdr('base64'));

    expect(result).toMatchObject({
      envelopeType: 'envelopeTypeTxFeeBump',
      transactionSource: source,
      feeSource: feePayer,
    });
    expect(result?.operations[0]).toMatchObject({ operationIndex: 1, sourceAccount: other });
  });

  it('does not interpret missing or invalid XDR as an empty list of operations', () => {
    expect(extractSorobanEnvelopeEvidence(null)).toBeNull();
    expect(extractSorobanEnvelopeEvidence('invalid XDR')).toBeNull();
  });
});
