import { PrivyClient } from '@privy-io/node';

import env from '../../../env';

let client: PrivyClient | undefined;

const verifyPrivyUser = async (
  authorization: string | undefined,
  userId: string,
): Promise<boolean> => {
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];

  if (!token || !env.PRIVY_APP_ID || !env.PRIVY_APP_SECRET) {
    return false;
  }

  client ??= new PrivyClient({
    appId: env.PRIVY_APP_ID,
    appSecret: env.PRIVY_APP_SECRET,
  });

  try {
    const claims = await client.utils().auth().verifyAccessToken(token);

    return claims.user_id === userId;
  } catch {
    return false;
  }
};

export default verifyPrivyUser;
