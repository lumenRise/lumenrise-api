import type { OpenApiPathCollection } from '../../types/network/openapi';

const withNetworkHeader = <T extends OpenApiPathCollection>(paths: T): T => {
  for (const path of Object.values(paths)) {
    for (const operation of Object.values(path)) {
      if (!operation || typeof operation !== 'object' || !('responses' in operation)) {
        continue;
      }

      operation.parameters = [
        ...(operation.parameters ?? []),
        {
          in: 'header',
          name: 'X-Stellar-Network',
          required: false,
          description:
            'Stellar network. Temporarily defaults to testnet when omitted. Legacy network query is accepted; conflicting selectors return 400. Identity and social connections are shared across networks.',
          schema: { type: 'string', enum: ['testnet', 'public'] },
        },
      ];
    }
  }

  return paths;
};

export default withNetworkHeader;
