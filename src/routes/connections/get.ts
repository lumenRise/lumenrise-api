import type { RequestHandler } from 'express';

import type { ApiResponse } from '../../types/response.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import GitHubDataSnapshot from '../../models/GitHubDataSnapshot.js';
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

      return {
        provider: account.provider,
        username: account.username,
        displayName: account.displayName,
        profileUrl: account.profileUrl,
        avatarUrl: account.avatarUrl,
        connectedAt: account.connectedAt.toISOString(),
        lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
        data: githubData
          ? {
              status: githubData.status,
              dataVersion: githubData.dataVersion,
              collectedAt: githubData.collectedAt.toISOString(),
            }
          : null,
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
