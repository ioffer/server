const fs = require('fs');
const path = require('path');

describe('schema.graphql presence and key types', () => {
  test('schema.graphql exists and contains type Query/Mutation', () => {
    const file = path.join(__dirname, '../../schema.graphql');
    expect(fs.existsSync(file)).toBe(true);
    const sdl = fs.readFileSync(file, 'utf8');
    expect(sdl).toContain('type Query');
    expect(sdl).toContain('type Mutation');
    expect(sdl).toContain('type User');
    expect(sdl).toContain('type Shop');
    expect(sdl).toContain('type Brand');
  });
});
