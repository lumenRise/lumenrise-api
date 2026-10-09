import log from '../../logger';
import processAvatarCleanup from './processAvatarCleanup';
import isAvatarStorageConfigured from './isAvatarStorageConfigured';

let running = false;

const refreshAvatarCleanup = async (): Promise<void> => {
  if (running || !isAvatarStorageConfigured()) {
    return;
  }

  running = true;

  try {
    await processAvatarCleanup();
  } catch (error) {
    log.error({ error }, 'Avatar cleanup cycle failed');
  } finally {
    running = false;
  }
};

export default refreshAvatarCleanup;
