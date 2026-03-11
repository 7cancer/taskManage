export function generateTaskId(prefix = 'T'): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
