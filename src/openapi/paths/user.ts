import jsonResponse from '../../utils/openapi/jsonResponse';

const userPaths = {
  '/v1/user': {
    get: {
      tags: ['Profile'],
      summary: 'Get the signed-in identity profile',
      operationId: 'getMyProfile',
      responses: {
        '200': jsonResponse('Profile retrieved.', { $ref: '#/components/schemas/MyProfile' }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/user/avatar': {
    put: {
      tags: ['Profile'],
      summary: 'Update the signed-in identity name, avatar, or both',
      operationId: 'putMyAvatar',
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              additionalProperties: false,
              anyOf: [{ required: ['avatar'] }, { required: ['name'] }],
              properties: {
                avatar: { type: 'string', format: 'binary' },
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 80,
                  description:
                    'Display name. Leading and trailing whitespace is removed; blank names are rejected.',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': jsonResponse('Profile updated.', { $ref: '#/components/schemas/MyProfile' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '413': { $ref: '#/components/responses/UploadLimitExceeded' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
    delete: {
      tags: ['Profile'],
      summary: 'Remove the signed-in identity avatar',
      operationId: 'deleteMyAvatar',
      responses: {
        '200': jsonResponse('Avatar removed.', { $ref: '#/components/schemas/MyProfile' }),
        '401': { $ref: '#/components/responses/Unauthorized' },
        '404': { $ref: '#/components/responses/NotFound' },
        '409': { $ref: '#/components/responses/Conflict' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default userPaths;
