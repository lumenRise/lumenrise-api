import { Types } from 'mongoose';
import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import GitLabEventFact from '../../models/GitLabEventFact.js';
import GitLabDataSnapshot from '../../models/GitLabDataSnapshot.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { GitLabEventsResult } from '../../types/reputation/gitlab.js';

const DEFAULT_PAGE_SIZE = 50;
const MAXIMUM_PAGE_SIZE = 100;
const getGitLabEventsRoute: RequestHandler = async (req, res) => {
  const requestedLimit = Number(req.query.limit ?? DEFAULT_PAGE_SIZE);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAXIMUM_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

  if (cursor && !Types.ObjectId.isValid(cursor)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid event cursor',
      result: {},
    };

    return res.status(400).json(response);
  }

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

  const facts = await GitLabEventFact.find({
    snapshot: snapshot._id,
    ...(cursor ? { _id: { $gt: new Types.ObjectId(cursor) } } : {}),
  })
    .sort({ _id: 1 })
    .limit(limit + 1);
  const hasNextPage = facts.length > limit;
  const page = hasNextPage ? facts.slice(0, limit) : facts;
  const response: ApiResponse<GitLabEventsResult> = {
    status: 'success',
    message: 'GitLab events retrieved',
    result: {
      items: page.map((fact) => ({
        eventId: fact.eventId,
        projectId: fact.projectId,
        actionName: fact.actionName,
        targetId: fact.targetId,
        targetIid: fact.targetIid,
        targetType: fact.targetType,
        targetTitle: fact.targetTitle,
        commitCount: fact.commitCount,
        refType: fact.refType,
        ref: fact.ref,
        eventCreatedAt: fact.eventCreatedAt.toISOString(),
      })),
      nextCursor: hasNextPage ? (page.at(-1)?._id.toString() ?? null) : null,
    },
  };

  return res.status(200).json(response);
};

export default getGitLabEventsRoute;
