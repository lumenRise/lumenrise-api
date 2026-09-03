import type { RequestHandler } from 'express';

import GitHubDataSnapshot from '../../models/GitHubDataSnapshot.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { GitHubDataSnapshotResult } from '../../types/reputation/github.js';

const getDeveloperReputationRoute: RequestHandler = async (req, res) => {
  const snapshot = await GitHubDataSnapshot.findOne({
    identity: req.auth?.identityId,
  }).sort({ collectedAt: -1 });

  if (!snapshot) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Developer reputation is not available',
      result: {},
    };

    return res.status(404).json(response);
  }

  const response: ApiResponse<GitHubDataSnapshotResult> = {
    status: 'success',
    message: 'Developer reputation retrieved',
    result: {
      provider: 'github',
      status: snapshot.status,
      dataVersion: snapshot.dataVersion,
      username: snapshot.username,
      coverage: snapshot.coverage,
      metrics: snapshot.metrics,
      contributionPeriods: snapshot.contributionPeriods.map((period) => ({
        key: period.key,
        from: period.from.toISOString(),
        to: period.to.toISOString(),
        totalContributions: period.totalContributions,
        commitContributions: period.commitContributions,
        issueContributions: period.issueContributions,
        pullRequestContributions: period.pullRequestContributions,
        pullRequestReviewContributions: period.pullRequestReviewContributions,
        repositoryContributions: period.repositoryContributions,
        restrictedContributions: period.restrictedContributions,
        repositoriesWithCommitContributions: period.repositoriesWithCommitContributions,
        repositoriesWithIssueContributions: period.repositoriesWithIssueContributions,
        repositoriesWithPullRequestContributions: period.repositoriesWithPullRequestContributions,
        repositoriesWithPullRequestReviewContributions:
          period.repositoriesWithPullRequestReviewContributions,
      })),
      collectedAt: snapshot.collectedAt.toISOString(),
    },
  };

  return res.status(200).json(response);
};

export default getDeveloperReputationRoute;
