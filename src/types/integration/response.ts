import type { ExternalAccountProvider } from './model.js';

interface ConnectionDataState {
  status: 'complete' | 'partial';
  dataVersion: string;
  collectedAt: string;
}

interface ConnectionResult {
  provider: ExternalAccountProvider;
  username: string;
  displayName: string | null;
  profileUrl: string | null;
  avatarUrl: string | null;
  connectedAt: string;
  lastSyncedAt: string | null;
  data: ConnectionDataState | null;
}

interface ConnectionsResult {
  connections: ConnectionResult[];
}

export type { ConnectionDataState, ConnectionResult, ConnectionsResult };
