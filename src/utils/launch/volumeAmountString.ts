const volumeAmountString = (high: string, low: string): Record<string, unknown> => ({
  $let: {
    vars: {
      head: { $add: [high, { $floor: { $divide: [low, { $toDecimal: '1000000000000000000' }] } }] },
      tail: { $toString: { $mod: [low, { $toDecimal: '1000000000000000000' }] } },
    },
    in: {
      $cond: [
        { $eq: ['$$head', 0] },
        '$$tail',
        {
          $concat: [
            { $toString: '$$head' },
            {
              $substrCP: [
                { $concat: ['000000000000000000', '$$tail'] },
                { $strLenCP: '$$tail' },
                18,
              ],
            },
          ],
        },
      ],
    },
  },
});

export default volumeAmountString;
