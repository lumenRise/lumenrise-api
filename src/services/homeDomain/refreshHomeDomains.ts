import log from '../../logger';
import refreshDueIssuers from './refreshDueIssuers';

let refreshing = false;

const refreshHomeDomains = async (): Promise<void> => {
  if (refreshing) {
    return;
  }

  refreshing = true;

  try {
    await refreshDueIssuers();
  } catch (error) {
    log.error({ error }, 'Home Domain refresh cycle failed');
  } finally {
    refreshing = false;
  }
};

export default refreshHomeDomains;
