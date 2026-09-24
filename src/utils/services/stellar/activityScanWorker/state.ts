const workerState = {
  workerTimer: null as NodeJS.Timeout | null,
  activeTick: null as Promise<void> | null,
};

export default workerState;
