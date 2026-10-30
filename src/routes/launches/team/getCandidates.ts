import { StrKey } from '@stellar/stellar-sdk';
import type { RequestHandler } from 'express';

import log from '../../../logger';
import Identity from '../../../models/Identity';
import EvmAccount from '../../../models/EvmAccount';
import StellarAccount from '../../../models/StellarAccount';
import isBaseAddress from '../../../utils/base/isBaseAddress';
import applicationRules from '../../../constants/applicationRules';

const getTeamCandidates: RequestHandler = async (req, res) => {
  const search = req.query.search;

  if (
    typeof search !== 'string' ||
    search.trim().length < applicationRules.team.searchMinLength ||
    search.trim().length > applicationRules.team.searchMaxLength
  ) {
    return res
      .status(400)
      .json({ status: 'error', message: 'Search must contain 2 to 80 characters', result: {} });
  }

  const query = search.trim();

  try {
    const isAddress =
      req.chain === 'base' ? isBaseAddress(query) : StrKey.isValidEd25519PublicKey(query);

    const account = !isAddress
      ? null
      : req.chain === 'base'
        ? await EvmAccount.findOne({ address: query.toLowerCase(), disconnectedAt: null })
            .select('identity')
            .lean()
        : await StellarAccount.findOne({ address: query, disconnectedAt: null })
            .select('identity')
            .lean();

    const filter = isAddress
      ? { _id: account?.identity ?? null }
      : { name: { $regex: query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } };

    const users = await Identity.find({
      ...filter,
      status: 'active',
      deletedAt: null,
      ...(req.chain === 'base'
        ? { name: { $type: 'string', $ne: '' } }
        : { 'externalUserIds.0': { $exists: true } }),
    })
      .select('name avatarUrl')
      .sort({ name: 1, _id: 1 })
      .limit(applicationRules.team.searchLimit)
      .lean();

    return res.json({
      status: 'success',
      message: 'Registered team candidates retrieved',
      result: {
        users: users.map((user) => ({
          identityId: user._id.toString(),
          name: user.name,
          avatarUrl: user.avatarUrl ?? null,
        })),
      },
    });
  } catch (error) {
    log.error({ error }, 'Team candidate search failed');

    return res
      .status(503)
      .json({ status: 'error', message: 'Team candidates are unavailable', result: {} });
  }
};

export default getTeamCandidates;
