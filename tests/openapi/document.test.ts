import request from 'supertest';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';

import app from '../../src/app';
import Identity from '../../src/models/Identity';
import openApiDocument from '../../src/openapi/document';
import createOpenApiValidator from '../helpers/createOpenApiValidator';
import collectResponseStatuses from '../helpers/collectResponseStatuses';
import listRegisteredOperations from '../helpers/listRegisteredOperations';

vi.mock('../../src/env', () => ({
  default: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    CLIENT_ORIGIN: 'http://localhost:5173',
    R2_MAX_AVATAR_BYTES: 5242880,
    R2_MAX_TOKEN_IMAGE_BYTES: 5242880,
  },
}));

const registered = listRegisteredOperations(resolve('src/routes/index.ts'));
const documented = Object.entries(openApiDocument.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({
    path: path.replace(/\/$/, ''),
    method,
    operation,
  })),
);

describe('OpenAPI documentation', () => {
  it('validates and documents every API operation', async () => {
    await expect(SwaggerParser.validate(openApiDocument as never)).resolves.toBeDefined();

    expect(documented.map(({ path, method }) => `${method} ${path}`).sort()).toEqual(
      registered.map(({ path, method }) => `${method} ${path}`).sort(),
    );
  });

  it('documents actual middleware security and every direct status code', () => {
    for (const route of registered) {
      const documentedRoute = documented.find(
        ({ path, method }) => path === route.path && method === route.method,
      )!;
      const security = documentedRoute.operation.security ?? openApiDocument.security;
      expect(security, `${route.method} ${route.path}`).toEqual(
        route.security ? [{ [route.security]: [] }] : [],
      );
      const codes = Object.keys(documentedRoute.operation.responses);
      for (const code of collectResponseStatuses(route.handlers)) {
        expect(codes, `${route.method} ${route.path}: ${code}`).toContain(code);
      }
    }
  });

  it('keeps operation IDs unique and path parameters complete', () => {
    const ids = documented.map(({ operation }) => operation.operationId);
    expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { path, operation } of documented) {
      const params = (operation.parameters ?? []) as Array<{
        in: string;
        name: string;
        required?: boolean;
      }>;
      expect(
        params
          .filter((param) => param.in === 'path')
          .map((param) => param.name)
          .sort(),
      ).toEqual([...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]).sort());
      expect(params.filter((param) => param.in === 'path').every((param) => param.required)).toBe(
        true,
      );
    }
  });

  it('authorizes identity and developer routes through the documented header schemes', async () => {
    for (const route of registered.filter((operation) => operation.security)) {
      const path = route.path.replace(/\{[^}]+\}/g, 'missing');
      const agent = request(app);
      const send = agent[route.method as 'get' | 'post' | 'put' | 'delete'];
      const response = await send.call(agent, path);
      expect(response.status, `${route.method} ${path}`).toBe(401);
      const validate = createOpenApiValidator({ $ref: '#/components/schemas/ErrorResponse' });
      expect(validate(response.body), JSON.stringify(validate.errors)).toBe(true);
    }
  });

  it('matches registration status and session response bodies to their schemas', async () => {
    const identity = {
      _id: '507f1f77bcf86cd799439011',
      status: 'active',
      name: 'Alice',
      avatarUrl: null,
    };
    const lookup = vi.spyOn(Identity, 'findOne').mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);

    try {
      const unregistered = await request(app).get('/v1/auth/status').set('x-user-id', '42');
      const validateStatus = createOpenApiValidator({
        $ref: '#/components/schemas/RegistrationStatus',
      });
      expect(unregistered.status).toBe(200);
      expect(validateStatus(unregistered.body.result), JSON.stringify(validateStatus.errors)).toBe(
        true,
      );
      lookup.mockReturnValue({ select: vi.fn().mockResolvedValue(identity) } as never);
      const registeredUser = await request(app).get('/v1/auth/status').set('x-user-id', '42');
      expect(registeredUser.status).toBe(200);
      expect(
        validateStatus(registeredUser.body.result),
        JSON.stringify(validateStatus.errors),
      ).toBe(true);
      const session = await request(app).get('/v1/auth/session').set('x-user-id', '42');
      const validateSession = createOpenApiValidator({
        $ref: '#/components/schemas/SessionResult',
      });
      expect(session.status).toBe(200);
      expect(validateSession(session.body.result), JSON.stringify(validateSession.errors)).toBe(
        true,
      );
      expect(session.body.result).not.toHaveProperty('expiresAt');
      expect(session.headers['set-cookie']).toBeUndefined();
    } finally {
      lookup.mockRestore();
    }
  });

  it('documents current registration inputs and populated upload error results', () => {
    const registration = openApiDocument.paths['/v1/auth/register']!.post!;
    const body = registration.requestBody as { content: Record<string, { schema: object }> };
    expect(Object.keys(body.content).sort()).toEqual(['application/json', 'multipart/form-data']);
    const validate = createOpenApiValidator(body.content['application/json']!.schema);
    expect(validate({ userId: 42, name: 'Alice' }), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({ userId: '42', name: 'Alice' })).toBe(true);
    expect(validate({ address: 'G...', challengeId: 'retired', signature: 'retired' })).toBe(false);
    const upload = openApiDocument.components.responses.UploadLimitExceeded;
    const validateUpload = createOpenApiValidator(upload.content['application/json'].schema);
    expect(
      validateUpload({ status: 'error', message: 'Too large', result: { maxBytes: 5242880 } }),
    ).toBe(true);
  });

  it('serves the document and interactive UI without authentication', async () => {
    const jsonResponse = await request(app).get('/v1/openapi.json');
    const htmlResponse = await request(app).get('/v1/docs/');

    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.headers['cache-control']).toBe('no-store');
    expect(jsonResponse.body).toEqual(openApiDocument);
    expect(htmlResponse.status).toBe(200);
    expect(htmlResponse.headers['content-type']).toContain('text/html');
    expect(htmlResponse.text).toContain('Lumenrise API Docs');
  });
});
