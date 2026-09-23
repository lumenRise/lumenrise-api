import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import GitLabDataSnapshot from '../../models/GitLabDataSnapshot.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { GitLabDataSnapshotResult } from '../../types/reputation/gitlab.js';

const getGitLabDeveloperRoute: RequestHandler = async (req, res) => {
  const account = await ExternalAccount.findOne({
    identity: req.auth?.identityId,
    provider: 'gitlab',
    status: 'connected',
  }).select('_id');

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'GitLab account is not connected',
      result: {},
    };

    return res.status(404).json(response);
  }

  const snapshot = await GitLabDataSnapshot.findOne({ externalAccount: account._id }).sort({
    collectedAt: -1,
  });

  if (!snapshot) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'GitLab reputation data is not available',
      result: {},
    };

    return res.status(404).json(response);
  }

  const response: ApiResponse<GitLabDataSnapshotResult> = {
    status: 'success',
    message: 'GitLab reputation data retrieved',
    result: {
      provider: 'gitlab',
      status: snapshot.status,
      dataVersion: snapshot.dataVersion,
      username: snapshot.username,
      coverage: snapshot.coverage,
      metrics: snapshot.metrics,
      activityFrom: snapshot.activityFrom?.toISOString() ?? null,
      activityTo: snapshot.activityTo.toISOString(),
      collectedAt: snapshot.collectedAt.toISOString(),
    },
  };

  return res.status(200).json(response);
};

export default getGitLabDeveloperRoute;
