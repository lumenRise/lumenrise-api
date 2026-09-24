const jsonResponse = (description: string, resultSchema: Record<string, unknown>) => ({
  description,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        required: ['status', 'message', 'result'],
        properties: {
          status: { type: 'string', const: 'success' },
          message: { type: 'string' },
          result: resultSchema,
        },
      },
    },
  },
});

export default jsonResponse;
