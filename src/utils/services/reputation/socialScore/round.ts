const round = (value: number, precision: number): number => {
  const multiplier = 10 ** precision;

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
};

export { round };
