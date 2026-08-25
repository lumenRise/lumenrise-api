interface HealthResult {
  service: 'lumenrise-api';
  state: 'ok';
  timestamp: string;
  uptime: number;
}

export type { HealthResult };
