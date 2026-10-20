import type { StellarNetwork } from '../network/configuration';
import type applicationRules from '../../constants/applicationRules';

interface PublicNetworkConfiguration {
  network: StellarNetwork;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
  factoryContractId: string;
  homeDomain: string;
  launchConfigured: boolean;
}

interface PublicConfiguration {
  version: 1;
  auth: { appId: string };
  network: {
    default: StellarNetwork;
    header: string;
    supported: readonly StellarNetwork[];
    configurations: Record<StellarNetwork, PublicNetworkConfiguration>;
  };
  features: {
    registration: boolean;
    imageUploads: boolean;
    githubConnection: boolean;
    xConnection: boolean;
  };
  uploads: {
    avatar: { maxBytes: number };
    tokenImage: { maxBytes: number };
    teamImage: { maxBytes: number };
  };
  rules: typeof applicationRules;
}

export type { PublicConfiguration, PublicNetworkConfiguration };
