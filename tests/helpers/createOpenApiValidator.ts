import Ajv from 'ajv';

import openApiDocument from '../../src/openapi/document';

const createOpenApiValidator = (schema: object) => {
  // The response schemas use JSON Schema keywords supported by this validator.
  // Components stay on the root so OpenAPI's local references resolve unchanged.
  const validator = new Ajv({ allErrors: true, unknownFormats: 'ignore' });

  return validator.compile({ components: openApiDocument.components, ...schema });
};

export default createOpenApiValidator;
