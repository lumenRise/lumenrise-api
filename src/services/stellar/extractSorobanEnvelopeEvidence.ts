import { Address, encodeMuxedAccountToAddress, StrKey, xdr } from '@stellar/stellar-sdk';

import type {
  SorobanEnvelopeEvidence,
  SorobanInvocationEvidence,
} from '../../types/stellar/soroban.js';

// Decode only the outer envelope and authorization tree. Neither an XDR credential
// nor a source account identifies who actually signed or owns the address.
const extractSorobanEnvelopeEvidence = (encoded: string | null): SorobanEnvelopeEvidence | null => {
  if (!encoded) {
    return null;
  }

  try {
    const envelope = xdr.TransactionEnvelope.fromXDR(encoded, 'base64');
    const feeSource =
      envelope.type === 'envelopeTypeTxFeeBump'
        ? encodeMuxedAccountToAddress(envelope.feeBump.tx.feeSource)
        : null;
    const inner =
      envelope.type === 'envelopeTypeTxFeeBump'
        ? envelope.feeBump.tx.innerTx.v1
        : envelope.type === 'envelopeTypeTx'
          ? envelope.v1
          : envelope.v0;
    const transactionSource =
      envelope.type === 'envelopeTypeTxV0'
        ? StrKey.encodeEd25519PublicKey(envelope.v0.tx.sourceAccountEd25519.toXdrObject())
        : encodeMuxedAccountToAddress(
            envelope.type === 'envelopeTypeTxFeeBump'
              ? envelope.feeBump.tx.innerTx.v1.tx.sourceAccount
              : envelope.v1.tx.sourceAccount,
          );

    const operations = inner.tx.operations.flatMap((operation, operationIndex) => {
      if (operation.body.type !== 'invokeHostFunction') {
        return [];
      }

      const { hostFunction, auth } = operation.body.invokeHostFunctionOp;
      const explicitSourceAccount = operation.sourceAccount
        ? encodeMuxedAccountToAddress(operation.sourceAccount)
        : null;
      const authorizations = auth.map((entry) => {
        const credentials = entry.credentials;
        const address =
          credentials.type === 'sorobanCredentialsAddress'
            ? Address.fromScAddress(credentials.address.address).toString()
            : credentials.type === 'sorobanCredentialsAddressV2'
              ? Address.fromScAddress(credentials.addressV2.address).toString()
              : credentials.type === 'sorobanCredentialsAddressWithDelegates'
                ? Address.fromScAddress(
                    credentials.addressWithDelegates.addressCredentials.address,
                  ).toString()
                : null;
        const delegates: Array<{ address: string; depth: number }> = [];
        if (credentials.type === 'sorobanCredentialsAddressWithDelegates') {
          const pendingDelegates = credentials.addressWithDelegates.delegates
            .slice()
            .reverse()
            .map((delegate) => ({ delegate, depth: 0 }));
          while (pendingDelegates.length > 0) {
            const { delegate, depth } = pendingDelegates.pop()!;
            delegates.push({ address: Address.fromScAddress(delegate.address).toString(), depth });
            pendingDelegates.push(
              ...delegate.nestedDelegates
                .slice()
                .reverse()
                .map((nestedDelegate) => ({ delegate: nestedDelegate, depth: depth + 1 })),
            );
          }
        }
        const invocations: SorobanInvocationEvidence[] = [];
        const pending = [{ invocation: entry.rootInvocation, depth: 0 }];
        while (pending.length > 0) {
          const { invocation, depth } = pending.pop()!;
          const authorizedFunction = invocation.function;
          invocations.push({
            depth,
            type: authorizedFunction.type,
            contractAddress:
              authorizedFunction.type === 'sorobanAuthorizedFunctionTypeContractFn'
                ? Address.fromScAddress(authorizedFunction.contractFn.contractAddress).toString()
                : null,
            functionName:
              authorizedFunction.type === 'sorobanAuthorizedFunctionTypeContractFn'
                ? authorizedFunction.contractFn.functionName.toString()
                : null,
          });
          pending.push(
            ...invocation.subInvocations
              .slice()
              .reverse()
              .map((subInvocation) => ({ invocation: subInvocation, depth: depth + 1 })),
          );
        }
        return { credentialType: credentials.type, address, delegates, invocations };
      });

      return [
        {
          operationIndex,
          sourceAccount: explicitSourceAccount ?? transactionSource,
          explicitSourceAccount,
          hostFunctionType: hostFunction.type,
          contractAddress:
            hostFunction.type === 'hostFunctionTypeInvokeContract'
              ? Address.fromScAddress(hostFunction.invokeContract.contractAddress).toString()
              : null,
          functionName:
            hostFunction.type === 'hostFunctionTypeInvokeContract'
              ? hostFunction.invokeContract.functionName.toString()
              : null,
          authorizations,
        },
      ];
    });

    return { envelopeType: envelope.type, transactionSource, feeSource, operations };
  } catch {
    // A missing or unparseable envelope is not evidence of an empty transaction.
    return null;
  }
};

export default extractSorobanEnvelopeEvidence;
