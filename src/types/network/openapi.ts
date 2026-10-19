interface OpenApiNetworkOperation {
  responses?: unknown;
  parameters?: unknown[];
}

type OpenApiPathCollection = Record<string, Record<string, OpenApiNetworkOperation>>;

export type { OpenApiPathCollection };
