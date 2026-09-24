const jsonBody = (schema: Record<string, unknown>) => ({
  required: true,
  content: { 'application/json': { schema } },
});

export default jsonBody;
