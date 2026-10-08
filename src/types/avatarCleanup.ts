interface AvatarCleanupRecord {
  objectKey: string;
  attempts: number;
  nextAttemptAt: Date;
  createdAt: Date;
}

export type { AvatarCleanupRecord };
