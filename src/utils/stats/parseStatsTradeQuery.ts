import statsScopes from '../../constants/stats/scopes';
import applicationRules from '../../constants/applicationRules';
import type { StatsTradeCursor, StatsTradeQuery } from '../../types/stats/activity';

const parseStatsTradeQuery = (
  query: Record<string, unknown>,
  now: Date,
): StatsTradeQuery | null => {
  const limit =
    query.limit === undefined ? applicationRules.trades.defaultLimit : Number(query.limit);

  const cursors = new Map<string, StatsTradeCursor>();

  if (
    (query.limit !== undefined && typeof query.limit !== 'string') ||
    !Number.isInteger(limit) ||
    limit < applicationRules.trades.minLimit ||
    limit > applicationRules.trades.maxLimit ||
    query.cursor !== undefined
  ) {
    return null;
  }

  try {
    for (const scope of statsScopes) {
      const value = query[scope.cursorKey];

      if (value === undefined) {
        continue;
      }

      if (
        typeof value !== 'string' ||
        value.length > applicationRules.trades.cursorMaxLength ||
        !/^[A-Za-z0-9_-]+$/.test(value)
      ) {
        return null;
      }

      const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

      if (
        !Array.isArray(parsed) ||
        parsed.length !== 6 ||
        parsed[0] !== 1 ||
        parsed[1] !== scope.cursorKey ||
        typeof parsed[2] !== 'string' ||
        typeof parsed[3] !== 'string' ||
        typeof parsed[4] !== 'string' ||
        !/^[a-f0-9]{24}$/.test(parsed[4]) ||
        parsed[5] !== 'desc'
      ) {
        return null;
      }

      const asOf = new Date(parsed[2]);
      const tradedAt = new Date(parsed[3]);

      if (
        !Number.isFinite(asOf.getTime()) ||
        !Number.isFinite(tradedAt.getTime()) ||
        asOf.toISOString() !== parsed[2] ||
        tradedAt.toISOString() !== parsed[3] ||
        asOf > now ||
        tradedAt > asOf
      ) {
        return null;
      }

      cursors.set(scope.cursorKey, { id: parsed[4], asOf, tradedAt });
    }
  } catch {
    return null;
  }

  return { limit, cursors };
};

export default parseStatsTradeQuery;
