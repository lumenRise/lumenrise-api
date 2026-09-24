import type { Types } from 'mongoose';

import XDataSnapshot from '../../models/XDataSnapshot.js';
import type { XUser } from '../../types/integration/x.js';
import type { XDataSnapshotDocument } from '../../types/reputation/x.js';
import { collectXPosts } from '../../utils/services/reputation/xData/collectXPosts.js';
import { buildXMetrics } from '../../utils/services/reputation/xData/buildXMetrics.js';
import {
  MILLISECONDS_PER_DAY,
  X_TIMELINE_PAGE_SIZE,
} from '../../constants/services/reputation/xData.js';

const X_DATA_VERSION = 'x-data-v1';

const collectXData = async (
  identityId: Types.ObjectId,
  externalAccountId: Types.ObjectId,
  user: XUser,
  accessToken: string,
  collectedAt = new Date(),
): Promise<XDataSnapshotDocument> => {
  const posts = await collectXPosts(user.id, accessToken);
  const activityFrom = posts.reduce<Date | null>((oldest, post) => {
    if (!post.created_at) {
      return oldest;
    }

    const createdAt = new Date(post.created_at);

    return !oldest || createdAt < oldest ? createdAt : oldest;
  }, null);

  const metrics = buildXMetrics(user, posts, collectedAt);

  return XDataSnapshot.create({
    identity: identityId,
    externalAccount: externalAccountId,
    providerAccountId: user.id,
    username: user.username,
    status: 'complete',
    dataVersion: X_DATA_VERSION,
    coverage: {
      profile: true,
      posts: true,
    },
    metrics,
    activityFrom,
    activityTo: collectedAt,
    collectedAt,
  });
};

export { buildXMetrics, collectXData, collectXPosts };

export { X_TIMELINE_PAGE_SIZE, MILLISECONDS_PER_DAY };
