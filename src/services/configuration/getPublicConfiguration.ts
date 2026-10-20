import env from '../../env';
import isR2Configured from '../../storage/isR2Configured';
import applicationRules from '../../constants/applicationRules';
import type { PublicConfiguration } from '../../types/configuration/public';
import getPublicNetworkConfiguration from './getPublicNetworkConfiguration';
import {
  stellarNetworks,
  defaultStellarNetwork,
  stellarNetworkHeader,
} from '../../constants/network';

const getPublicConfiguration = (): PublicConfiguration => ({
  version: 1,
  auth: { appId: env.AUTH_PROVIDER_APP_ID || '' },
  network: {
    default: defaultStellarNetwork,
    header: stellarNetworkHeader,
    supported: stellarNetworks,
    configurations: {
      testnet: getPublicNetworkConfiguration('testnet'),
      public: getPublicNetworkConfiguration('public'),
    },
  },
  features: {
    registration: Boolean(
      env.AUTH_PROVIDER_API_URL && env.AUTH_PROVIDER_APP_ID && env.AUTH_PROVIDER_APP_SECRET,
    ),
    imageUploads: isR2Configured(),
    githubConnection: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
    xConnection: Boolean(env.X_CLIENT_ID && env.X_CLIENT_SECRET),
  },
  uploads: {
    avatar: { maxBytes: env.R2_MAX_AVATAR_BYTES },
    tokenImage: { maxBytes: env.R2_MAX_TOKEN_IMAGE_BYTES },
    teamImage: { maxBytes: env.R2_MAX_AVATAR_BYTES },
  },
  rules: applicationRules,
});

export default getPublicConfiguration;
