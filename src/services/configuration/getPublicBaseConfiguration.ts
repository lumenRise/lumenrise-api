import env from '../../env';
import isR2Configured from '../../storage/isR2Configured';
import type { BasePublicConfiguration } from '../../types/base/public';
import baseApplicationRules from '../../constants/base/applicationRules';
import getPublicBaseNetworkConfiguration from './getPublicBaseNetworkConfiguration';

const getPublicBaseConfiguration = (): BasePublicConfiguration => {
  return {
    version: 1,
    chain: 'base',
    auth: { appId: env.PRIVY_APP_ID || '' },
    network: {
      default: 'testnet',
      header: 'X-Network',
      supported: ['testnet', 'public'],
      configurations: {
        testnet: getPublicBaseNetworkConfiguration('testnet'),
        public: getPublicBaseNetworkConfiguration('public'),
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
    rules: baseApplicationRules,
  };
};

export default getPublicBaseConfiguration;
