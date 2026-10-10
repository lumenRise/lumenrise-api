import type { LaunchDraftRecord } from '../../types/launch/draft';

const toDraftResult = (draft: LaunchDraftRecord & { _id: { toString(): string } }) => ({
  draftId: draft._id.toString(),
  schemaVersion: draft.schemaVersion,
  network: draft.network,
  ownerAddress: draft.ownerAddress,
  method: draft.method,
  status: draft.status,
  data: draft.data,
  imageId: draft.imageId?.toString() ?? null,
  assetContractId: draft.assetContractId,
  transactionHash: draft.transactionHash,
  verifiedContractId: draft.verifiedContractId,
  launchContractId: draft.launchContractId,
  submittedAt: draft.submittedAt?.toISOString() ?? null,
  confirmedAt: draft.confirmedAt?.toISOString() ?? null,
  createdAt: draft.createdAt.toISOString(),
  updatedAt: draft.updatedAt.toISOString(),
});

export default toDraftResult;
