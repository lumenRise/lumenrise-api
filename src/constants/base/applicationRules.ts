import applicationRules from '../applicationRules';

const baseApplicationRules = {
  ...applicationRules,
  launches: {
    ...applicationRules.launches,
    amountScale: null,
    priceScale: null,
  },
  base: {
    maxTokenDecimals: 18,
    amountUnit: 'token_base_units',
    priceUnit: 'pair_base_units_per_whole_asset',
    decimalsSource: 'launch.assetDecimals_and_pairDecimals',
    tradeEvents: ['Bought', 'Sold'],
    reputationRequired: false,
    buyPaymentIncludesFee: true,
    sellMinimumAfterFee: true,
    sellRightsFollowTransfers: false,
    totalSupplyMeaning: 'creator_deposit',
  },
} as const;

export default baseApplicationRules;
