import { formatBytes } from '../format';

describe('formatBytes', () => {
  it('formats across units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatBytes(3 * 1024 ** 3)).toBe('3.0 GB');
  });

  it('handles invalid input', () => {
    expect(formatBytes(-1)).toBe('0 B');
    expect(formatBytes(NaN)).toBe('0 B');
  });
});
