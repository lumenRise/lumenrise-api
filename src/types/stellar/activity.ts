interface StellarActivityPageSummary {
  scope: 'page';
  operationCount: number;
  initiatedOperationCount: number;
  relatedOperationCount: number;
  distinctTransactionCount: number;
  activeDayCount: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  operationTypeCounts: Record<string, number>;
  sentPaymentCount: number;
  receivedPaymentCount: number;
  selfPaymentCount: number;
  trustlineChangeCount: number;
  offerActionCount: number;
  contractInvocationCount: number;
}

export type { StellarActivityPageSummary };
