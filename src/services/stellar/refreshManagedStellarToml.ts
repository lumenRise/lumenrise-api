import log from '../../logger';
import syncManagedStellarToml from './syncManagedStellarToml';

let running = false;

const refreshManagedStellarToml = async (): Promise<void> => {
  if (running) {
    return;
  }

  running = true;

  try {
    await syncManagedStellarToml();
  } catch (error) {
    log.error({ error }, 'Managed stellar.toml sync cycle failed');
  } finally {
    running = false;
  }
};

export default refreshManagedStellarToml;
