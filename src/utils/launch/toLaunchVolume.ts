import decimalInteger from './decimalInteger';
import type { LaunchListVolume } from '../../types/launch/list';

const toLaunchVolume = (volume?: LaunchListVolume): LaunchListVolume => ({
  grossPairAmount: (BigInt(decimalInteger(volume?.grossPairAmount ?? '0')) * 2n).toString(),
  assetAmount: decimalInteger(volume?.assetAmount ?? '0'),
  tradeCount: volume?.tradeCount ?? 0,
  buyCount: volume?.buyCount ?? 0,
  sellCount: volume?.sellCount ?? 0,
});

export default toLaunchVolume;
