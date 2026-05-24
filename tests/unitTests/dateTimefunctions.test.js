const dateTime = require('../../helpers/DateTimefunctions');

describe('helpers/DateTimefunctions', () => {
  test('returns a formatted timestamp string', () => {
    const ts = dateTime();
    expect(typeof ts).toBe('string');
    // expected format: YYYY-M-D-HH-mm-ss (numbers separated by -)
    const parts = ts.split('-');
    expect(parts.length).toBe(6);
    const [year, month, day, hour, min, sec] = parts.map((p) => Number(p));
    expect(year).toBeGreaterThanOrEqual(2020);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThanOrEqual(23);
    expect(min).toBeGreaterThanOrEqual(0);
    expect(min).toBeLessThanOrEqual(59);
    expect(sec).toBeGreaterThanOrEqual(0);
    expect(sec).toBeLessThanOrEqual(59);
  });

  test('consecutive invocations should be monotonic (non-decreasing) in lexical order for same second granularity', () => {
    const a = dateTime();
    const b = dateTime();
    // Given same format and same second resolution, b should be >= a lexically or equal
    expect(b >= a).toBe(true);
  });
});
