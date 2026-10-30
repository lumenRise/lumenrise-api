import type { OpenApiPathCollection } from '../../types/network/openapi';

const withNetworkHeader = <T extends OpenApiPathCollection>(paths: T): T => {
  for (const [pathname, path] of Object.entries(paths)) {
    for (const operation of Object.values(path)) {
      if (!operation || typeof operation !== 'object' || !('responses' in operation)) {
        continue;
      }

      operation.parameters = [
        ...(operation.parameters ?? []),
        ...(['/v1/auth', '/v1/user', '/v1/launches', '/v1/config'].some((prefix): boolean =>
          pathname.startsWith(prefix),
        )
          ? [
              {
                in: 'header',
                name: 'X-Chain',
                required: false,
                description:
                  'Select stellar (default) or base. Existing Stellar requests are unchanged.',
                schema: { type: 'string', enum: ['stellar', 'base'] },
              },
              {
                in: 'header',
                name: 'X-Network',
                required: false,
                description:
                  'Base network only: testnet is Base Sepolia, public is Base mainnet. Do not combine with X-Stellar-Network.',
                schema: { type: 'string', enum: ['testnet', 'public'] },
              },
            ]
          : []),
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
