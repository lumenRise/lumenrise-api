import log from '../../logger';
import isR2Configured from '../../storage/isR2Configured';
import processTokenImageCleanup from './processTokenImageCleanup';

let running = false;

const refreshTokenImageCleanup = async (): Promise<void> => {
  if (running || !isR2Configured()) {
    return;
  }

  running = true;

  try {
    await processTokenImageCleanup();
  } catch (error) {
    log.error({ error }, 'Token image cleanup cycle failed');
  } finally {
    running = false;
  }
};

export default refreshTokenImageCleanup;
