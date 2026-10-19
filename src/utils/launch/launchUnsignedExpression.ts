const launchUnsignedExpression = (field: string): Record<string, unknown> => ({
  $cond: [
    {
      $regexMatch: {
        input: { $convert: { input: field, to: 'string', onError: '', onNull: '' } },
        regex: '^\\d+$',
      },
    },
    { $convert: { input: field, to: 'decimal', onError: null, onNull: null } },
    null,
  ],
});

export default launchUnsignedExpression;
