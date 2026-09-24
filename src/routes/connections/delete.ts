import type { RequestHandler } from 'express';

import log from '../../logger.js';
import XDataSnapshot from '../../models/XDataSnapshot.js';
import ExternalAccount from '../../models/ExternalAccount.js';
import { revokeXAccessToken } from '../../services/oauth/x.js';
import IntegrationSyncJob from '../../models/IntegrationSyncJob.js';
import ProviderCredential from '../../models/ProviderCredential.js';
import ReputationSnapshot from '../../models/ReputationSnapshot.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import { revokeGitLabAccessToken } from '../../services/oauth/gitlab.js';
import { revokeGitHubAccessToken } from '../../services/oauth/github.js';
import { EXTERNAL_ACCOUNT_PROVIDERS } from '../../constants/integration.js';
import type { ExternalAccountProvider } from '../../types/integration/model.js';
import { getProviderCredential } from '../../services/integration/providerCredential.js';
import { calculateAndStoreDeveloperReputation } from '../../services/reputation/developerScore.js';

const isExternalAccountProvider = (provider: string): provider is ExternalAccountProvider =>
  EXTERNAL_ACCOUNT_PROVIDERS.some((candidate) => candidate === provider);
const deleteConnectionRoute: RequestHandler = async (req, res) => {
  const providerParam = req.params.provider;
  const provider = typeof providerParam === 'string' ? providerParam : null;

  if (!provider || !isExternalAccountProvider(provider)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Unsupported connection provider',
      result: {},
    };

    return res.status(400).json(response);
  }

  const disconnectedAt = new Date();

  let providerAccessToken: string | null = null;
  const account = await ExternalAccount.findOneAndUpdate(
    {
      identity: req.auth?.identityId,
      provider,
      status: 'connected',
    },
    {
      $set: {
        status: 'disconnected',
        syncLeaseUntil: null,
        disconnectedAt,
        ...(provider === 'x' ? { lastSyncedAt: null } : {}),
      },
    },
    { runValidators: true, returnDocument: 'after' },
  );

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Connected account was not found',
      result: {},
    };

    return res.status(404).json(response);
  }

  if (provider === 'github' || provider === 'gitlab' || provider === 'x') {
    try {
      const credential = await getProviderCredential(account._id);

      providerAccessToken = credential?.accessToken ?? null;
    } catch (error) {
      log.warn(
        { error, externalAccountId: account._id, provider },
        'Provider credential could not be read',
      );
    }
  }

  if (providerAccessToken) {
    try {
      if (provider === 'github') {
        await revokeGitHubAccessToken(providerAccessToken);
      }

      if (provider === 'gitlab') {
        await revokeGitLabAccessToken(providerAccessToken);
      }

      if (provider === 'x') {
        await revokeXAccessToken(providerAccessToken);
      }
    } catch (error) {
      log.warn(
        { error, externalAccountId: account._id, provider },
        'Provider token revocation failed',
      );
    }
  }

  await IntegrationSyncJob.updateMany(
    { externalAccount: account._id, active: true },
    {
      $set: {
        status: 'cancelled',
        active: false,
        completedAt: disconnectedAt,
        leaseUntil: null,
        lastError: 'Connection was disconnected',
      },
    },
    { runValidators: true },
  );
  await ProviderCredential.deleteOne({ externalAccount: account._id });

  if (provider === 'x') {
    await Promise.all([
      XDataSnapshot.deleteMany({ externalAccount: account._id }),
      ReputationSnapshot.deleteMany({ identity: account.identity, category: 'social' }),
      IntegrationSyncJob.updateMany(
        { externalAccount: account._id, provider: 'x', resultSnapshot: { $ne: null } },
        { $set: { resultSnapshot: null } },
      ),
    ]);
  }

  if (provider === 'github' || provider === 'gitlab') {
    try {
      await calculateAndStoreDeveloperReputation(account.identity);
    } catch (error) {
      log.warn(
        { error, identityId: account.identity, provider },
        'Developer reputation could not be recalculated after disconnection',
      );
    }
  }

  const response: ApiResponse<EmptyResult> = {
    status: 'success',
    message: `${provider} account disconnected`,
    result: {},
  };

  return res.status(200).json(response);
};

export default deleteConnectionRoute;
