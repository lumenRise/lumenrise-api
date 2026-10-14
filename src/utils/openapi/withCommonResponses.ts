import type { OpenApiOperation } from '../../types/openapi/operation';

const withCommonResponses = (
  paths: Record<string, Record<string, OpenApiOperation>>,
): Record<string, Record<string, OpenApiOperation>> =>
  Object.fromEntries(
    Object.entries(paths).map(([path, methods]) => [
      path,
      Object.fromEntries(
        Object.entries(methods).map(([method, operation]) => {
          const usesIdentity =
            operation.security === undefined ||
            operation.security.some((requirement) => Object.hasOwn(requirement, 'userIdHeader'));

          return [
            method,
            {
              ...operation,
              responses: {
                '500': { $ref: '#/components/responses/InternalServerError' },
                ...(usesIdentity
                  ? {
                      '401': { $ref: '#/components/responses/Unauthorized' },
                      '403': { $ref: '#/components/responses/Forbidden' },
                    }
                  : {}),
                ...operation.responses,
              },
            },
          ];
        }),
      ),
    ]),
  );

export default withCommonResponses;
