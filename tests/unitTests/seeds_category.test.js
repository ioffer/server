const CategorySeeds = require('../../seeds/category');

describe('seeds/category.js', () => {
  test('exports a non-empty object with an "all" root', () => {
    expect(CategorySeeds && typeof CategorySeeds === 'object').toBe(true);
    expect(Object.keys(CategorySeeds).length).toBeGreaterThan(0);
    expect(CategorySeeds).toHaveProperty('all');
  });

  test('contains nested categories under Electronic Devices', () => {
    const root = CategorySeeds.all || {};
    expect(root).toHaveProperty('Electronic Devices');
    expect(typeof root['Electronic Devices']).toBe('object');

    const desktops = root['Electronic Devices'].Desktops;
    expect(typeof desktops).toBe('object');
  });
});
