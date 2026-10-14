const chartLaunchStart = (config: Record<string, unknown> | undefined): Date | null => {
  const params = config?.params as Record<string, unknown> | undefined;
  const value = params?.starts_at;

  if (
    (typeof value !== 'string' || !/^\d+$/.test(value)) &&
    (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
  ) {
    return null;
  }

  const date = new Date(Number(value) * 1000);

  return Number.isFinite(date.getTime()) ? date : null;
};

export default chartLaunchStart;
