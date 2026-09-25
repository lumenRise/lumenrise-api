import workerState from './state.js';

const stopSorobanEvidenceWorker = async (): Promise<void> => {
  if (workerState.timer) {
    clearInterval(workerState.timer);
  }
  workerState.timer = null;
  await workerState.activeTick;
};

export { stopSorobanEvidenceWorker };
