const workerState: {
  timer: NodeJS.Timeout | null;
  activeTick: Promise<void> | null;
} = {
  timer: null,
  activeTick: null,
};

export default workerState;
