import { timeAgo } from './timeAgo';

describe('timeAgo', () => {
  const now = new Date('2026-05-23T01:00:00Z').getTime();

  it('returns minutes ago for recent times', () => {
    const ts = new Date('2026-05-23T00:55:00Z').toISOString();
    expect(timeAgo(ts, now)).toBe('5m ago');
  });

  it('returns hours ago for older times', () => {
    const ts = new Date('2026-05-22T23:00:00Z').toISOString();
    expect(timeAgo(ts, now)).toBe('2h ago');
  });

  it('returns minutes for sub-hour gap', () => {
    const ts = new Date('2026-05-23T00:01:47Z').toISOString();
    expect(timeAgo(ts, now)).toBe('58m ago');
  });

  it('returns — for empty string', () => {
    expect(timeAgo('', now)).toBe('—');
  });

  it('returns — for invalid timestamp', () => {
    expect(timeAgo('not-a-date', now)).toBe('—');
  });

  it('returns — for future timestamp', () => {
    const ts = new Date('2026-05-23T02:00:00Z').toISOString();
    expect(timeAgo(ts, now)).toBe('—');
  });
});
