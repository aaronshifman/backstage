export function timeAgo(timestamp: string, now: number = Date.now()): string {
  if (!timestamp) return '—';
  const ms = Date.parse(timestamp);
  if (isNaN(ms)) return '—';
  const diffMin = Math.floor((now - ms) / 60000);
  if (diffMin <= 0) return '—';
  if (diffMin < 60) return `${diffMin}m ago`;
  return `${Math.floor(diffMin / 60)}h ago`;
}
