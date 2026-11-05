import type { RequestHandler } from 'express';

import log from '../../logger';
import { revokeXAccessToken } from '../../services/oauth/x';
import ProviderCredential from '../../models/ProviderCredential';
import type { ApiResponse, EmptyResult } from '../../types/response';
import { revokeGitHubAccessToken } from '../../services/oauth/github';
import { getProviderCredential } from '../../services/integration/providerCredential';
import { publishReputationJob } from '../../services/integration/publishReputationJob';
import disconnectExternalAccount from '../../services/integration/disconnectExternalAccount';
import { isExternalAccountProvider } from '../../utils/routes/connections/delete/isExternalAccountProvider';

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

  const disconnected = await disconnectExternalAccount(
    req.auth!.identityId,
    provider,
    disconnectedAt,
  );

  const account = disconnected?.account;

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Connected account was not found',
      result: {},
    };

    return res.status(404).json(response);
  }

  if (provider === 'github' || provider === 'x') {
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

  await ProviderCredential.deleteOne({ externalAccount: account._id });

  try {
    await publishReputationJob(
      'lumenrise.reputation.connection-cleanup.v1',
      disconnected!.cleanupJobId,
    );
  } catch (error) {
    log.warn(
      { err: error, externalAccountId: account._id },
      'Disconnected account cleanup will be reconciled by the reputation worker',
    );
  }

  const response: ApiResponse<EmptyResult> = {
    status: 'success',
    message: `${provider} account disconnected`,
    result: {},
  };

  return res.status(200).json(response);
};

export default deleteConnectionRoute;
