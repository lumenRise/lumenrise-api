const schedulerState = {
  schedulerTimer: null as NodeJS.Timeout | null,
  activeScan: null as Promise<void> | null,
};

export default schedulerState;
