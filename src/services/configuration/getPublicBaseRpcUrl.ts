import env from '../../env';

const getPublicBaseRpcUrl = (network: 'testnet' | 'public'): string => {
  const rpcUrl = network === 'testnet' ? env.BASE_TESTNET_RPC_URL : env.BASE_PUBLIC_RPC_URL;

  if (!rpcUrl) {
    return '';
  }

  try {
    const url = new URL(rpcUrl);

    if (
      (url.protocol !== 'https:' &&
        !(
          url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        )) ||
      url.username ||
      url.password ||
      url.hash
    ) {
      return '';
    }

    return rpcUrl;
  } catch {
    return '';
  }
};

export default getPublicBaseRpcUrl;
