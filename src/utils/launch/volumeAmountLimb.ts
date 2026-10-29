const volumeAmountLimb = (field: string, part: 'high' | 'low'): Record<string, unknown> => ({
  $let: {
    vars: { length: { $strLenCP: field } },
    in: {
      $toDecimal: {
        $cond: [
          { $gt: ['$$length', 18] },
          {
            $substrCP: [
              field,
              part === 'high' ? 0 : { $subtract: ['$$length', 18] },
              part === 'high' ? { $subtract: ['$$length', 18] } : 18,
            ],
          },
          part === 'high' ? '0' : field,
        ],
      },
    },
  },
});

export default volumeAmountLimb;
