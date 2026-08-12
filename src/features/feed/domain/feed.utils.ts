export function parseFeedTimestamp(dateVal: any): number {
  if (!dateVal) return 0;
  if (typeof dateVal === 'number') return dateVal;
  if (typeof dateVal === 'string') return new Date(dateVal).getTime() || 0;
  if (dateVal instanceof Date) return dateVal.getTime();
  if (typeof dateVal?.toDate === 'function') return dateVal.toDate().getTime();
  if (typeof dateVal?.seconds === 'number') return dateVal.seconds * 1000;
  return 0;
}
