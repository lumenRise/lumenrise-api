import type { Request } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

import env from '../../env';
import type { LaunchListQuery } from '../../types/launch/list';

const parseLaunchListQuery = (query: Request['query']): LaunchListQuery | null => {
  const network = query.network ?? env.STELLAR_AUTH_NETWORK;
  const owner = query.owner;
  const search = query.search ?? query.q;
  const categoryRaw = query.category ?? 'all';
  const sort = query.sort ?? 'newest';
  const direction = query.direction ?? query.dir ?? 'desc';
  const pair = query.pair;
  const pageRaw = query.page ?? '1';
  const limitRaw = query.limit ?? '20';
  const page = typeof pageRaw === 'string' ? Number(pageRaw) : NaN;
  const limit = typeof limitRaw === 'string' ? Number(limitRaw) : NaN;

  if (
    (network !== 'testnet' && network !== 'public') ||
    (owner !== undefined &&
      (typeof owner !== 'string' ||
        (!StrKey.isValidEd25519PublicKey(owner) && !StrKey.isValidContract(owner)))) ||
    (search !== undefined && (typeof search !== 'string' || search.length > 100)) ||
    typeof categoryRaw !== 'string' ||
    typeof sort !== 'string' ||
    ![
      'newest',
      'name',
      'symbol',
      'trending',
      'topVolume',
      'almostGraduated',
      'participants',
      'figure',
      'date',
      'phase',
      'category',
    ].includes(sort) ||
    (direction !== 'asc' && direction !== 'desc') ||
    (pair !== undefined && (typeof pair !== 'string' || !StrKey.isValidContract(pair))) ||
    ((sort === 'topVolume' || sort === 'figure') && pair === undefined) ||
    !Number.isInteger(page) ||
    page < 1 ||
    page > 100_000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    return null;
  }

  const category = categoryRaw.toLowerCase().replaceAll(' ', '-');

  if (!['all', 'bonding-curve', 'auction', 'pre-sale'].includes(category)) {
    return null;
  }

  return {
    network,
    owner,
    search: typeof search === 'string' ? search.trim() : undefined,
    category: category as LaunchListQuery['category'],
    sort: sort as LaunchListQuery['sort'],
    direction,
    pair,
    page,
    limit,
  };
};

export default parseLaunchListQuery;
