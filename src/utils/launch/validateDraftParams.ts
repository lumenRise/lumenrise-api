import { StrKey } from '@stellar/stellar-sdk';

const validateDraftParams = (
  input: unknown,
  owner: string,
  imageUrl: string,
): input is Record<string, unknown> => {
  const numeric = (value: unknown, max: bigint): boolean =>
    typeof value === 'string' && /^\d+$/.test(value) && BigInt(value) <= max;

  const record = (value: unknown): Record<string, unknown> | null =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const params = record(input);
  const metadata = record(params?.metadata);
  const allocations = record(params?.allocations);
  const vesting = record(params?.vesting);
  const schedule = record(vesting?.schedule);
  const curve = record(params?.curve);

  if (!params || !metadata || !allocations || !vesting || !schedule || !curve) {
    return false;
  }

  const bps = [allocations.pool_bps, allocations.curve_bps, allocations.team_bps];

  if (
    !bps.every(
      (value) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 10_000,
    )
  ) {
    return false;
  }

  if (
    (bps[0] as number) <= 0 ||
    (bps[1] as number) <= 0 ||
    bps.reduce<number>((sum, value) => sum + (value as number), 0) !== 10_000
  ) {
    return false;
  }

  const maxU64 = 18_446_744_073_709_551_615n;
  const maxI128 = 170_141_183_460_469_231_731_687_303_715_884_105_727n;

  if (
    params.owner !== owner ||
    typeof params.asset !== 'string' ||
    !StrKey.isValidContract(params.asset) ||
    typeof params.pair !== 'string' ||
    !StrKey.isValidContract(params.pair) ||
    typeof metadata.name !== 'string' ||
    metadata.name.length < 1 ||
    metadata.name.length > 64 ||
    typeof metadata.symbol !== 'string' ||
    !/^[A-Za-z0-9]{1,12}$/.test(metadata.symbol) ||
    typeof metadata.description !== 'string' ||
    metadata.description.length < 1 ||
    metadata.description.length > 1024 ||
    metadata.logo !== imageUrl ||
    !numeric(vesting.cliff_seconds, maxU64) ||
    !numeric(vesting.duration_seconds, maxU64) ||
    !['Daily', 'Weekly', 'Monthly'].includes(String(schedule.tag)) ||
    !numeric(curve.virtual_base_reserve, maxI128) ||
    BigInt(curve.virtual_base_reserve as string) === 0n ||
    !numeric(curve.virtual_quote_reserve, maxI128) ||
    BigInt(curve.virtual_quote_reserve as string) === 0n ||
    !numeric(curve.graduation_target, maxI128) ||
    BigInt(curve.graduation_target as string) === 0n ||
    !Number.isInteger(curve.creator_fee_bps) ||
    (curve.creator_fee_bps as number) < 0 ||
    (curve.creator_fee_bps as number) > 10_000 ||
    !Number.isInteger(curve.creator_payout_bps) ||
    (curve.creator_payout_bps as number) < 0 ||
    (curve.creator_payout_bps as number) > 10_000 ||
    !numeric(params.starts_at, maxU64) ||
    !numeric(params.ends_at, maxU64) ||
    BigInt(params.ends_at as string) <= BigInt(params.starts_at as string)
  ) {
    return false;
  }

  return true;
};

export default validateDraftParams;
