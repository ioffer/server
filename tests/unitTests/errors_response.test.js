const errors = require('../../errors_response.json');

describe('errors_response.json', () => {
  test('is an array with at least one error specimen', () => {
    expect(Array.isArray(errors)).toBe(true);
    expect(errors.length).toBeGreaterThan(0);
  });

  test('contains expected shapes for GraphQL error responses', () => {
    const sample = errors[0];
    expect(sample).toHaveProperty('errors');
    expect(Array.isArray(sample.errors)).toBe(true);
    expect(sample).toHaveProperty('data');

    const first = sample.errors[0];
    expect(first).toHaveProperty('message');
    // message should be string
    expect(typeof first.message).toBe('string');
  });

  test('contains an UNAUTHENTICATED specimen with code 401', () => {
    const unauth = errors.find((e) => Array.isArray(e.errors) && e.errors.some((x) => x.code === 401));
    expect(unauth).toBeTruthy();
  });
});
