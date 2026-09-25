import workerState from './state.js';
import log from '../../../../logger.js';
import { processSorobanEvidence } from './processSorobanEvidence.js';

const scheduleSorobanEvidenceTick = (): void => {
  if (workerState.activeTick) {
    return;
  }

  workerState.activeTick = processSorobanEvidence()
    .catch((error: unknown) => {
      log.error({ error }, 'Soroban evidence worker tick failed');
    })
    .finally(() => {
      workerState.activeTick = null;
    });
};

export { scheduleSorobanEvidenceTick };
