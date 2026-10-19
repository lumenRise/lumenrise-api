import type { LaunchRecord } from './model';

interface LaunchListQuery {
  network: 'testnet' | 'public';
  owner?: string;
  search?: string;
  category: 'all' | 'bonding-curve' | 'auction' | 'pre-sale';
  sort:
    | 'newest'
    | 'name'
    | 'symbol'
    | 'trending'
    | 'topVolume'
    | 'almostGraduated'
    | 'participants'
    | 'figure'
    | 'date'
    | 'phase'
    | 'category';
  direction: 'asc' | 'desc';
  pair?: string;
  page: number;
  limit: number;
}

interface LaunchListVolume {
  grossPairAmount: string;
  assetAmount: string;
  tradeCount: number;
  buyCount: number;
  sellCount: number;
}

interface LaunchListRecord extends LaunchRecord {
  volume24h: LaunchListVolume;
}

interface LaunchListPage {
  launches: LaunchListRecord[];
  total: { count: number }[];
}

export type { LaunchListQuery, LaunchListVolume, LaunchListRecord, LaunchListPage };
