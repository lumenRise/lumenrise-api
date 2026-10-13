import { X_SYNC_MIN_INTERVAL_MS } from '../../constants/integration';
import ManualRefreshCooldown from '../../models/ManualRefreshCooldown';
import type { ExternalAccountDocument } from '../../types/integration/model';

const getXScoreUpdateAvailability = async (
  account: ExternalAccountDocument,
  now = new Date(),
): Promise<{ canUpdateScore: boolean; nextScoreUpdateAt: string | null }> => {
  const cooldown = await ManualRefreshCooldown.findOne({
    identity: account.identity,
    target: 'x-sync',
  });

  const nextAllowed = Math.max(
    cooldown?.nextAllowedAt.getTime() ?? 0,
    account.lastSyncedAt ? account.lastSyncedAt.getTime() + X_SYNC_MIN_INTERVAL_MS : 0,
  );

  return {
    canUpdateScore: nextAllowed <= now.getTime(),
    nextScoreUpdateAt: nextAllowed > now.getTime() ? new Date(nextAllowed).toISOString() : null,
  };
};

export default getXScoreUpdateAvailability;
