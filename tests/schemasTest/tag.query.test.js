const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../../schema/typeDefs.js');
const resolvers = require('../../schema/resolver.js');
const { connect, cleanup, disconnect } = require('../modelsTest/helpers');
const { Tag } = require('../../models');

let server;
let currentContext = {};

beforeAll(async () => {
  await connect();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  server = new ApolloServer({
    schema,
    context: () => ({ ...currentContext }),
  });
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await cleanup();
  currentContext = {};
});

async function seedTags() {
  const t1 = await Tag.create({ title: 'Electronics' });
  const t2 = await Tag.create({ title: 'Fashion' });
  const t3 = await Tag.create({ title: 'Grocery' });
  return { t1: await Tag.findById(t1.id), t2: await Tag.findById(t2.id), t3: await Tag.findById(t3.id) };
}

describe('Tag schema queries and mutations', () => {
  describe('Tag Queries (schema/tag/query.js)', () => {
    test('tags returns all tags', async () => {
      const { t1, t2, t3 } = await seedTags();
      const res = await server.executeOperation({ query: `query { tags { id title } }` });
      expect(res.errors).toBeUndefined();
      const titles = res.data.tags.map((x) => x.title);
      expect(titles).toEqual(expect.arrayContaining([t1.title, t2.title, t3.title]));
    });

    test('tagById returns the requested tag', async () => {
      const { t1 } = await seedTags();
      const res = await server.executeOperation({
        query: `query($id: ID!){ tagById(id: $id){ id title } }`,
        variables: { id: t1.id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.tagById.id).toBe(t1.id);
      expect(res.data.tagById.title).toBe(t1.title);
    });

    test('tagByTitle returns a tag by its unique title', async () => {
      const { t2 } = await seedTags();
      const res = await server.executeOperation({
        query: `query($title: String!){ tagByTitle(title: $title){ id title } }`,
        variables: { title: t2.title },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.tagByTitle.id).toBe(t2.id);
      expect(res.data.tagByTitle.title).toBe(t2.title);
    });
  });

  describe('Tag Mutations (schema/tag/query.js)', () => {
    test('createTag creates a new tag when it does not exist', async () => {
      currentContext = { user: { id: '000000000000000000000000' }, isAuth: true };
      const res = await server.executeOperation({
        query: `mutation($title: String!){ createTag(title: $title){ id title } }`,
        variables: { title: 'Home' },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.createTag.title).toBe('Home');
      const saved = await Tag.findOne({ title: 'Home' });
      expect(saved).toBeTruthy();
    });

    test('createTag returns existing tag if title already exists (no duplicate)', async () => {
      const existing = await Tag.create({ title: 'Unique' });
      currentContext = { user: { id: '000000000000000000000000' }, isAuth: true };
      const res = await server.executeOperation({
        query: `mutation($title: String!){ createTag(title: $title){ id title } }`,
        variables: { title: 'Unique' },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.createTag.id).toBe(existing.id);
      const count = await Tag.countDocuments({ title: 'Unique' });
      expect(count).toBe(1);
    });
  });
});
