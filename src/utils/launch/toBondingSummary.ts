import type { LaunchRecord } from '../../types/launch/model';

const STALE_AFTER_MS = 60_000;
const BPS = 10_000n;

const toBondingSummary = (launch: LaunchRecord, now = new Date()) => {
  const record = (value: unknown): Record<string, unknown> | null =>
    value !== null && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;

  const unsigned = (value: unknown): string | null => {
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return value;
    }

    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
      return String(value);
    }

    return null;
  };

  const count = (value: unknown): number | null =>
    typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;

  const config = record(launch.config);
  const params = record(config?.params);
  const allocations = record(params?.allocations);
  const buckets = record(config?.buckets);
  const curve = record(params?.curve);
  const vesting = record(params?.vesting);
  const state = record(launch.state);

  const totalSupply = unsigned(config?.total_supply);
  const startsAt = unsigned(params?.starts_at);
  const endsAt = unsigned(params?.ends_at);
  const target = unsigned(curve?.graduation_target);
  const sold = unsigned(state?.sold);
  const quoteReserve = unsigned(state?.quote_reserve);
  const creatorFees = unsigned(state?.creator_fees);
  const teamClaimed = unsigned(state?.team_claimed);
  const buyerCount = count(state?.buyer_count);
  const pool = unsigned(buckets?.pool);
  const curveBucket = unsigned(buckets?.curve);
  const team = unsigned(buckets?.team);
  const poolBps = count(allocations?.pool_bps);
  const curveBps = count(allocations?.curve_bps);
  const teamBps = count(allocations?.team_bps);
  const creatorFeeBps = count(curve?.creator_fee_bps);
  const creatorPayoutBps = count(curve?.creator_payout_bps);
  const platformFeeBps = count(config?.platform_fee_bps);
  const virtualBaseReserve = unsigned(curve?.virtual_base_reserve);
  const virtualQuoteReserve = unsigned(curve?.virtual_quote_reserve);
  const cliffSeconds = unsigned(vesting?.cliff_seconds);
  const durationSeconds = unsigned(vesting?.duration_seconds);
  const rawSchedule = vesting?.schedule;
  const schedule = Array.isArray(rawSchedule)
    ? rawSchedule[0]
    : (record(rawSchedule)?.tag ?? rawSchedule);

  if (
    totalSupply === null ||
    startsAt === null ||
    endsAt === null ||
    target === null ||
    sold === null ||
    quoteReserve === null ||
    creatorFees === null ||
    teamClaimed === null ||
    buyerCount === null ||
    pool === null ||
    curveBucket === null ||
    team === null ||
    poolBps === null ||
    curveBps === null ||
    teamBps === null ||
    creatorFeeBps === null ||
    creatorPayoutBps === null ||
    platformFeeBps === null ||
    virtualBaseReserve === null ||
    virtualQuoteReserve === null ||
    cliffSeconds === null ||
    durationSeconds === null ||
    !['Daily', 'Weekly', 'Monthly'].includes(String(schedule)) ||
    typeof state?.graduated !== 'boolean' ||
    BigInt(target) === 0n
  ) {
    return null;
  }

  const nowSeconds = BigInt(Math.floor(now.getTime() / 1000));

  const status = state.graduated
    ? 'Graduated'
    : nowSeconds < BigInt(startsAt)
      ? 'Scheduled'
      : nowSeconds >= BigInt(endsAt)
        ? 'Failed'
        : 'Open';

  const rawProgressBps = (BigInt(quoteReserve) * BPS) / BigInt(target);
  const progressBps = Number(rawProgressBps > BPS ? BPS : rawProgressBps);

  return {
    version: 1,
    status,
    statusAsOf: now.toISOString(),
    stateStale: now.getTime() - launch.stateObservedAt.getTime() > STALE_AFTER_MS,
    startsAt,
    endsAt,
    totalSupply,
    allocations: { poolBps, curveBps, teamBps },
    buckets: { pool, curve: curveBucket, team },
    vesting: { cliffSeconds, durationSeconds, schedule: String(schedule) },
    curve: {
      graduationTarget: target,
      virtualBaseReserve,
      virtualQuoteReserve,
      creatorFeeBps,
      creatorPayoutBps,
      platformFeeBps,
    },
    state: { sold, quoteReserve, creatorFees, teamClaimed, buyerCount, graduated: state.graduated },
    progressBps,
  };
};

export default toBondingSummary;
