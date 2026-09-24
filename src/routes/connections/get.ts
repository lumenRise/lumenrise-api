import type { RequestHandler } from 'express';

import XDataSnapshot from '../../models/XDataSnapshot.js';
import type { ApiResponse } from '../../types/response.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import GitLabDataSnapshot from '../../models/GitLabDataSnapshot.js';
import GitHubDataSnapshot from '../../models/GitHubDataSnapshot.js';
import IntegrationSyncJob from '../../models/IntegrationSyncJob.js';
import createIntegrationSyncJobResult from '../../services/integration/syncJobResult.js';
import type { ConnectionResult, ConnectionsResult } from '../../types/integration/response.js';

const getConnectionsRoute: RequestHandler = async (req, res) => {
  const accounts = await ExternalAccount.find({
    identity: req.auth?.identityId,
    status: 'connected',
  }).sort({ connectedAt: 1 });
  const connections = await Promise.all(
    accounts.map(async (account): Promise<ConnectionResult> => {
      const githubData =
        account.provider === 'github'
          ? await GitHubDataSnapshot.findOne({ externalAccount: account._id }).sort({
              collectedAt: -1,
            })
          : null;
      const gitlabData =
        account.provider === 'gitlab'
          ? await GitLabDataSnapshot.findOne({ externalAccount: account._id }).sort({
              collectedAt: -1,
            })
          : null;
      const xData =
        account.provider === 'x'
          ? await XDataSnapshot.findOne({ externalAccount: account._id }).sort({
              collectedAt: -1,
            })
          : null;
      const providerData = githubData ?? gitlabData ?? xData;
      const syncJob =
        account.provider === 'github' || account.provider === 'gitlab' || account.provider === 'x'
          ? await IntegrationSyncJob.findOne({ externalAccount: account._id }).sort({
              createdAt: -1,
            })
          : null;

      return {
        provider: account.provider,
        username: account.username,
        displayName: account.displayName,
        profileUrl: account.profileUrl,
        avatarUrl: account.avatarUrl,
        connectedAt: account.connectedAt.toISOString(),
        lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
        data: providerData
          ? {
              status: providerData.status,
              dataVersion: providerData.dataVersion,
              collectedAt: providerData.collectedAt.toISOString(),
            }
          : null,
        sync: syncJob ? createIntegrationSyncJobResult(syncJob) : null,
      };
    }),
  );
  const response: ApiResponse<ConnectionsResult> = {
    status: 'success',
    message: 'Connections retrieved',
    result: { connections },
  };

  return res.status(200).json(response);
};

export default getConnectionsRoute;
