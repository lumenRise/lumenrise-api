import env from '../../env';
import isR2Configured from '../../storage/isR2Configured';
import applicationRules from '../../constants/applicationRules';
import getBaseConfiguration from '../base/getBaseConfiguration';
import type { BasePublicConfiguration } from '../../types/base/public';

const getPublicBaseConfiguration = (): BasePublicConfiguration => {
  const testnet = getBaseConfiguration('testnet');
  const mainnet = getBaseConfiguration('public');

  return {
    version: 1,
    chain: 'base',
    auth: { appId: env.PRIVY_APP_ID || '' },
    network: {
      default: 'testnet',
      header: 'X-Network',
      supported: ['testnet', 'public'],
      configurations: {
        testnet: {
          network: 'testnet',
          chainId: 84532,
          factoryContractId: testnet?.factoryAddress ?? '',
          launchConfigured: testnet !== null,
        },
        public: {
          network: 'public',
          chainId: 8453,
          factoryContractId: mainnet?.factoryAddress ?? '',
          launchConfigured: mainnet !== null,
        },
      },
    },
    features: {
      registration: Boolean(env.PRIVY_APP_ID && env.PRIVY_APP_SECRET),
      imageUploads: isR2Configured(),
      githubConnection: false,
      xConnection: false,
    },
    uploads: {
      avatar: { maxBytes: env.R2_MAX_IMAGE_BYTES },
      tokenImage: { maxBytes: env.R2_MAX_IMAGE_BYTES },
      teamImage: { maxBytes: env.R2_MAX_IMAGE_BYTES },
    },
    rules: applicationRules,
  };
};

export default getPublicBaseConfiguration;
