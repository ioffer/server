// Jest setup: disable console output during tests
// This keeps test output clean and aligns with the requirement to disable consoles in Jest tests.

const noop = () => {};

const methods = ['log', 'warn', 'error', 'info', 'debug', 'trace'];
for (const m of methods) {
  if (console[m] && typeof console[m] === 'function') {
    jest.spyOn(console, m).mockImplementation(noop);
  }
}
