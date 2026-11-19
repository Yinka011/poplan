export const DEFAULT_PROCESSING_RATE = 2.71;

export function calculatePayout(
  revenue: number,
  commissionRate: number,
  processingRate: number,
  tax = 0,
) {
  const processingFee = (revenue + tax) * (processingRate / 100);
  const commission = (revenue - processingFee) * (commissionRate / 100);
  return {
    commissionAmount: Math.round(commission * 100) / 100,
    payoutAmount: Math.round((revenue - processingFee - commission) * 100) / 100,
  };
}
