const initialLaunchPrice = (
  config: Record<string, unknown> | undefined,
  assetDecimals: number = 7,
): string | null => {
  const params = config?.params as Record<string, unknown> | undefined;
  const curve = params?.curve as Record<string, unknown> | undefined;
  const reserve = (value: unknown): bigint | null => {
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return BigInt(value);
    }

    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
      return BigInt(value);
    }

    return null;
  };
  const base = reserve(curve?.virtual_base_reserve);
  const quote = reserve(curve?.virtual_quote_reserve);

  if (
    base === null ||
    quote === null ||
    base <= 0n ||
    quote <= 0n ||
    !Number.isInteger(assetDecimals) ||
    assetDecimals < 0 ||
    assetDecimals > 18
  ) {
    return null;
  }

  // Contract current_price at sold=0, including its upward rounding and scale.
  return ((quote * 10n ** BigInt(assetDecimals) + base - 1n) / base).toString();
};

export default initialLaunchPrice;
