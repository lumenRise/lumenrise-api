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
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
  '/v1/user/avatar': {
    put: {
      tags: ['Profile'],
      summary: 'Upload or replace the signed-in identity avatar',
      operationId: 'putMyAvatar',
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: {
          type: 'object', required: ['avatar'],
          properties: { avatar: { type: 'string', format: 'binary' } },
        } } },
      },
      responses: {
        '200': jsonResponse('Avatar updated.', { $ref: '#/components/schemas/MyProfile' }),
        '400': { $ref: '#/components/responses/BadRequest' },
        '401': { $ref: '#/components/responses/Unauthorized' },
        '409': { $ref: '#/components/responses/Conflict' },
        '413': { description: 'Image exceeds the configured upload limit.' },
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
        '409': { $ref: '#/components/responses/Conflict' },
        '503': { $ref: '#/components/responses/ServiceUnavailable' },
      },
    },
  },
} as const;

export default userPaths;
