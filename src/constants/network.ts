import type { StellarNetwork } from '../types/network/configuration';

const stellarNetworks = ['testnet', 'public'] as const satisfies readonly StellarNetwork[];
const defaultStellarNetwork: StellarNetwork = 'testnet';
const stellarNetworkHeader = 'X-Stellar-Network';

export { stellarNetworks, defaultStellarNetwork, stellarNetworkHeader };
