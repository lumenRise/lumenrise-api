import type { CurvePriceParams } from '../../types/launch/market';

const bondingPrice = (
  config: Record<string, unknown>,
  state: Record<string, unknown>,
): string | null => {
  try {
    const params = config.params as CurvePriceParams;
    const base = BigInt(String(params.curve.virtual_base_reserve));
    const quote = BigInt(String(params.curve.virtual_quote_reserve));
    const sold = BigInt(String(state.sold));
    const remaining = base - sold;

    if (sold < 0n || remaining <= 0n || quote <= 0n) {
      return null;
    }

    const denominator = remaining * remaining;

    return ((quote * base * 10_000_000n + denominator - 1n) / denominator).toString();
  } catch {
    return null;
  }
};

export default bondingPrice;
