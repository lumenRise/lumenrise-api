import { Types } from 'mongoose';
import type { RequestHandler } from 'express';

import ExternalAccount from '../../models/ExternalAccount.js';
import GitHubDataSnapshot from '../../models/GitHubDataSnapshot.js';
import GitHubRepositoryFact from '../../models/GitHubRepositoryFact.js';
import type { ApiResponse, EmptyResult } from '../../types/response.js';
import type { GitHubRepositoriesResult } from '../../types/reputation/github.js';

const DEFAULT_PAGE_SIZE = 50;
const MAXIMUM_PAGE_SIZE = 100;
const getDeveloperRepositoriesRoute: RequestHandler = async (req, res) => {
  const requestedLimit = Number(req.query.limit ?? DEFAULT_PAGE_SIZE);
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAXIMUM_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

  if (cursor && !Types.ObjectId.isValid(cursor)) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Invalid repository cursor',
      result: {},
    };

    return res.status(400).json(response);
  }

  const account = await ExternalAccount.findOne({
    identity: req.auth?.identityId,
    provider: 'github',
    status: 'connected',
  }).select('_id');

  if (!account) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'GitHub account is not connected',
      result: {},
    };

    return res.status(404).json(response);
  }

  const snapshot = await GitHubDataSnapshot.findOne({ externalAccount: account._id }).sort({
    collectedAt: -1,
  });

  if (!snapshot) {
    const response: ApiResponse<EmptyResult> = {
      status: 'error',
      message: 'Developer reputation is not available',
      result: {},
    };

    return res.status(404).json(response);
  }

  const facts = await GitHubRepositoryFact.find({
    snapshot: snapshot._id,
    ...(cursor ? { _id: { $gt: new Types.ObjectId(cursor) } } : {}),
  })
    .sort({ _id: 1 })
    .limit(limit + 1);
  const hasNextPage = facts.length > limit;
  const page = hasNextPage ? facts.slice(0, limit) : facts;
  const response: ApiResponse<GitHubRepositoriesResult> = {
    status: 'success',
    message: 'GitHub repositories retrieved',
    result: {
      items: page.map((fact) => ({
        repositoryId: fact.repositoryId,
        nameWithOwner: fact.nameWithOwner,
        isFork: fact.isFork,
        isArchived: fact.isArchived,
        starCount: fact.starCount,
        forkCount: fact.forkCount,
        watcherCount: fact.watcherCount,
        openIssueCount: fact.openIssueCount,
        mergedPullRequestCount: fact.mergedPullRequestCount,
        releaseCount: fact.releaseCount,
        primaryLanguage: fact.primaryLanguage,
        repositoryCreatedAt: fact.repositoryCreatedAt.toISOString(),
        lastPushedAt: fact.lastPushedAt?.toISOString() ?? null,
      })),
      nextCursor: hasNextPage ? (page.at(-1)?._id.toString() ?? null) : null,
    },
  };

  return res.status(200).json(response);
};

export default getDeveloperRepositoriesRoute;
