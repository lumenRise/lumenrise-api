import { StrKey } from '@stellar/stellar-sdk';
import type { RequestHandler } from 'express';

import env from '../../env';
import log from '../../logger';
import LaunchDraft from '../../models/LaunchDraft';
import StellarAccount from '../../models/StellarAccount';
import toDraftResult from '../../utils/launch/toDraftResult';
import validateDraftData from '../../utils/launch/validateDraftData';

const postLaunchDraftRoute: RequestHandler = async (req, res) => {
  const { network, ownerAddress, data } = req.body ?? {};

  if (
    network !== env.STELLAR_AUTH_NETWORK ||
    !['testnet', 'public'].includes(network) ||
    typeof ownerAddress !== 'string' ||
    !StrKey.isValidEd25519PublicKey(ownerAddress) ||
    !validateDraftData(data)
  ) {
    return res.status(400).json({ status: 'error', message: 'Invalid bonding draft', result: {} });
  }

  try {
    const connected = await StellarAccount.exists({
      identity: req.auth!.identityId,
      address: ownerAddress,
      disconnectedAt: null,
    });

    if (!connected) {
      return res
        .status(403)
        .json({ status: 'error', message: 'Owner wallet is not connected', result: {} });
    }

    const draft = await LaunchDraft.create({
      ownerIdentityId: req.auth!.identityId,
      ownerAddress,
      network,
      method: 'bonding',
      schemaVersion: 1,
      status: 'editing',
      data,
    });

    res.setHeader('Cache-Control', 'no-store');

    return res
      .status(201)
      .json({ status: 'success', message: 'Draft created', result: toDraftResult(draft) });
  } catch (error) {
    log.error({ error }, 'Launch draft creation failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Launch draft is unavailable', result: {} });
  }
};

export default postLaunchDraftRoute;
