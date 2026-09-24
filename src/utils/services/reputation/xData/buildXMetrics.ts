import type { XUser } from '../../../../types/integration/x.js';
import type { XDataMetrics, XPost } from '../../../../types/reputation/x.js';
import { MILLISECONDS_PER_DAY } from '../../../../constants/services/reputation/xData.js';

const buildXMetrics = (user: XUser, posts: XPost[], collectedAt: Date): XDataMetrics => {
  const publicMetrics = user.public_metrics;
  const activeDays = new Set<string>();
  const accountCreatedAt = user.created_at ? new Date(user.created_at) : collectedAt;
  const accountAgeDays = Math.max(
    0,
    Math.floor((collectedAt.getTime() - accountCreatedAt.getTime()) / MILLISECONDS_PER_DAY),
  );

  let originalPostCount = 0;
  let replyPostCount = 0;
  let repostCount = 0;
  let quotePostCount = 0;
  let receivedRepostCount = 0;
  let receivedReplyCount = 0;
  let receivedLikeCount = 0;
  let receivedQuoteCount = 0;
  let receivedBookmarkCount = 0;
  let impressionCount = 0;

  for (const post of posts) {
    const references = post.referenced_tweets ?? [];
    const metrics = post.public_metrics;

    if (references.some((reference) => reference.type === 'retweeted')) {
      repostCount += 1;
    } else if (references.some((reference) => reference.type === 'replied_to')) {
      replyPostCount += 1;
    } else if (references.some((reference) => reference.type === 'quoted')) {
      quotePostCount += 1;
    } else {
      originalPostCount += 1;
    }

    if (post.created_at) {
      activeDays.add(post.created_at.slice(0, 10));
    }

    receivedRepostCount += metrics?.retweet_count ?? 0;
    receivedReplyCount += metrics?.reply_count ?? 0;
    receivedLikeCount += metrics?.like_count ?? 0;
    receivedQuoteCount += metrics?.quote_count ?? 0;
    receivedBookmarkCount += metrics?.bookmark_count ?? 0;
    impressionCount += metrics?.impression_count ?? 0;
  }

  return {
    accountAgeDays,
    followerCount: publicMetrics?.followers_count ?? 0,
    followingCount: publicMetrics?.following_count ?? 0,
    reportedPostCount: publicMetrics?.tweet_count ?? 0,
    listedCount: publicMetrics?.listed_count ?? 0,
    profileLikeCount: publicMetrics?.like_count ?? 0,
    mediaCount: publicMetrics?.media_count ?? 0,
    collectedPostCount: posts.length,
    originalPostCount,
    replyPostCount,
    repostCount,
    quotePostCount,
    activeDayCount: activeDays.size,
    receivedRepostCount,
    receivedReplyCount,
    receivedLikeCount,
    receivedQuoteCount,
    receivedBookmarkCount,
    impressionCount,
  };
};

export { buildXMetrics };
