import type { ExternalAccountDocument } from './model';

interface DisconnectedAccount {
  account: ExternalAccountDocument;
  cleanupJobId: string;
}

export type { DisconnectedAccount };
