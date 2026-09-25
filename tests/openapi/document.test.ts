import request from 'supertest';
import { describe, expect, it } from 'vitest';
import SwaggerParser from '@apidevtools/swagger-parser';

import app from '../../src/app.js';
import openApiDocument from '../../src/openapi/document.js';

const expectedOperations = [
  'GET /v1/health',
  'GET /v1/openapi.json',
  'GET /v1/docs/',
  'POST /v1/auth/wallet/challenge',
  'POST /v1/auth/wallet/register',
  'POST /v1/auth/wallet/login',
  'GET /v1/policies',
  'POST /v1/policies',
  'GET /v1/policies/{key}',
  'POST /v1/policies/{key}/evaluate',
  'GET /v1/developers/keys',
  'POST /v1/developers/keys',
  'DELETE /v1/developers/keys/{id}',
  'GET /v1/developers/profile',
  'GET /v1/reputation/sybil/evidence',
  'GET /v1/auth/session',
  'DELETE /v1/auth/session',
  'GET /v1/oauth/github/connect',
  'GET /v1/oauth/github/callback',
  'GET /v1/oauth/github/start',
  'GET /v1/oauth/gitlab/connect',
  'GET /v1/oauth/gitlab/callback',
  'GET /v1/oauth/gitlab/start',
  'GET /v1/oauth/x/connect',
  'GET /v1/oauth/x/callback',
  'GET /v1/oauth/x/start',
  'GET /v1/connections',
  'DELETE /v1/connections/{provider}',
  'POST /v1/connections/github/sync',
  'GET /v1/connections/github/sync/{jobId}',
  'POST /v1/connections/gitlab/sync',
  'GET /v1/connections/gitlab/sync/{jobId}',
  'POST /v1/connections/x/sync',
  'GET /v1/connections/x/sync/{jobId}',
  'GET /v1/reputation/developer',
  'GET /v1/reputation/profile',
  'GET /v1/reputation/developer/repositories',
  'GET /v1/reputation/developer/score',
  'GET /v1/reputation/developer/gitlab',
  'GET /v1/reputation/developer/gitlab/projects',
  'GET /v1/reputation/developer/gitlab/events',
  'GET /v1/reputation/social/x',
  'GET /v1/reputation/social/score',
  'GET /v1/reputation/stellar',
  'GET /v1/stellar/accounts/{address}',
  'GET /v1/stellar/accounts/{address}/operations',
  'GET /v1/stellar/accounts/{address}/activity-scan',
  'POST /v1/stellar/accounts/{address}/activity-scan',
  'GET /v1/stellar/accounts/{address}/activity-score',
];

describe('OpenAPI documentation', () => {
  it('validates and documents every API operation', async () => {
    await expect(SwaggerParser.validate(openApiDocument as never)).resolves.toBeDefined();

    const operations = Object.entries(openApiDocument.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );

    expect(operations.sort()).toEqual(expectedOperations.sort());
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
