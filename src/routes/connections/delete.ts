import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import { EXTERNAL_ACCOUNT_PROVIDERS } from '../../constants/integration.js';
import type { ExternalAccountProvider } from '../../types/integration/model.js';

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
  const account = await ExternalAccount.findOneAndUpdate(
    {
      identity: req.auth?.identityId,
      provider,
      status: 'connected',
    },
    {
      $set: {
        status: 'disconnected',
        disconnectedAt,
      },
    },
    { new: true, runValidators: true },
  );

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Connected account was not found',
      result: {},
    };

    return res.status(404).json(response);
  }

  const response: ApiResponse<EmptyResult> = {
    status: 'success',
    message: `${provider} account disconnected`,
    result: {},
  };

  return res.status(200).json(response);
};

export default deleteConnectionRoute;
