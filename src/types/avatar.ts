interface StoredAvatar {
  objectKey: string;
  publicUrl: string;
}

interface AvatarResult {
  identityId: string;
  name: string | null;
  avatarUrl: string | null;
}

type AvatarMutationResult =
  { status: 'updated'; result: AvatarResult } | { status: 'missing' } | { status: 'conflict' };

export type { AvatarMutationResult, AvatarResult, StoredAvatar };
