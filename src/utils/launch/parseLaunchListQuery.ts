import type { Request } from 'express';
import { StrKey } from '@stellar/stellar-sdk';

import isBaseAddress from '../base/isBaseAddress';
import type { Chain } from '../../types/network/chain';
import type { LaunchListQuery } from '../../types/launch/list';
import applicationRules from '../../constants/applicationRules';
import type { StellarNetwork } from '../../types/network/configuration';

const parseLaunchListQuery = (
  query: Request['query'],
  network: StellarNetwork,
  chain: Chain = 'stellar',
): LaunchListQuery | null => {
  const owner = query.owner;
  const search = query.search ?? query.q;
  const categoryRaw = query.category ?? applicationRules.launches.defaultCategory;
  const sort = query.sort ?? applicationRules.launches.defaultSort;

  const requestedDirection =
    query.direction ?? query.dir ?? applicationRules.launches.defaultDirection;

  const direction = applicationRules.launches.directions.find(
    (value) => value === requestedDirection,
  );

  const pair = query.pair;
  const pageRaw = query.page ?? String(applicationRules.launches.minPage);
  const limitRaw = query.limit ?? String(applicationRules.launches.defaultLimit);
  const page = typeof pageRaw === 'string' ? Number(pageRaw) : NaN;
  const limit = typeof limitRaw === 'string' ? Number(limitRaw) : NaN;

  if (
    (owner !== undefined &&
      (typeof owner !== 'string' ||
        (chain === 'base'
          ? !isBaseAddress(owner)
          : !StrKey.isValidEd25519PublicKey(owner) && !StrKey.isValidContract(owner)))) ||
    (search !== undefined &&
      (typeof search !== 'string' || search.length > applicationRules.launches.searchMaxLength)) ||
    typeof categoryRaw !== 'string' ||
    typeof sort !== 'string' ||
    !applicationRules.launches.sorts.some((value) => value === sort) ||
    !direction ||
    (pair !== undefined &&
      (typeof pair !== 'string' ||
        (chain === 'base' ? !isBaseAddress(pair) : !StrKey.isValidContract(pair)))) ||
    (applicationRules.launches.pairRequiredSorts.some((value) => value === sort) &&
      pair === undefined) ||
    !Number.isInteger(page) ||
    page < applicationRules.launches.minPage ||
    page > applicationRules.launches.maxPage ||
    !Number.isInteger(limit) ||
    limit < applicationRules.launches.minLimit ||
    limit > applicationRules.launches.maxLimit
  ) {
    return null;
  }

  const category = categoryRaw.toLowerCase().replaceAll(' ', '-');

  if (!applicationRules.launches.categories.some((value) => value === category)) {
    return null;
  }

  return {
    chain,
    network,
    owner: chain === 'base' && typeof owner === 'string' ? owner.toLowerCase() : owner,
    search: typeof search === 'string' ? search.trim() : undefined,
    category: category as LaunchListQuery['category'],
    sort: sort as LaunchListQuery['sort'],
    direction,
    pair: chain === 'base' && typeof pair === 'string' ? pair.toLowerCase() : pair,
    page,
    limit,
  };
};

export default parseLaunchListQuery;
