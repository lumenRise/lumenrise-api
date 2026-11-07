import type { Chain } from '../../types/network/chain';
import TestnetActivity from '../../models/TestnetActivity';
import requestDomainRead from '../messaging/requestDomainRead';
import testnetActivity from '../../constants/launch/testnetActivity';

const notifications = new Map<Chain, number>();

const recordTestnetActivity = async (chain: Chain, observedAt: number): Promise<void> => {
  await TestnetActivity.updateOne(
    { _id: chain },
    {
      $max: { activeUntil: new Date(observedAt + testnetActivity.idleTimeoutMs) },
      $setOnInsert: { network: 'testnet' },
    },
    { upsert: true },
  );

  const now = Date.now();
  const previous = notifications.get(chain);

  if (previous !== undefined && now - previous < testnetActivity.notificationIntervalMs) {
    return;
  }

  notifications.set(chain, now);

  try {
    await requestDomainRead('launch', 'testnet.activity', { chain, network: 'testnet' });
  } catch (error) {
    if (notifications.get(chain) === now) {
      notifications.delete(chain);
    }

    throw error;
  }
};

export default recordTestnetActivity;
