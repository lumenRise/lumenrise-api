interface OpenApiOperation {
  security?: readonly Record<string, readonly string[]>[];
  responses: Record<string, object>;
  [key: string]: unknown;
}

export type { OpenApiOperation };
