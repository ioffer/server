const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../../schema/typeDefs.js');
const resolvers = require('../../schema/resolver.js');
const { connect, cleanup, disconnect } = require('../modelsTest/helpers');
const { Category } = require('../../models');

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

async function seedCategoriesSimple() {
  const c1 = await Category.create({ title: 'Cat One', level: 0 });
  const c2 = await Category.create({ title: 'Cat Two', level: 1 });
  const c3 = await Category.create({ title: 'Cat Three', level: 3 });
  return { c1, c2, c3 };
}

async function seedCategoryTree() {
  // root -> child -> grandchild
  const root = await Category.create({ title: 'Root', level: 0 });
  const child = await Category.create({ title: 'Child', level: 1, parentCategory: root.id });
  const grand = await Category.create({ title: 'Grand', level: 2, parentCategory: child.id });

  // Maintain explicit subCategories arrays so populate works
  root.subCategories = [child.id];
  await root.save();
  const freshChild = await Category.findById(child.id);
  freshChild.subCategories = [grand.id];
  await freshChild.save();

  return { root: await Category.findById(root.id), child: await Category.findById(child.id), grand: await Category.findById(grand.id) };
}

describe('Category schema queries', () => {
  test('categories returns all categories', async () => {
    const { c1, c2, c3 } = await seedCategoriesSimple();
    const res = await server.executeOperation({ query: `query { categories { id title level } }` });
    expect(res.errors).toBeUndefined();
    const titles = res.data.categories.map((c) => c.title);
    expect(titles).toEqual(expect.arrayContaining([c1.title, c2.title, c3.title]));
  });

  test('categoryById returns the requested category', async () => {
    const { c1 } = await seedCategoriesSimple();
    const res = await server.executeOperation({
      query: `query($id: ID!){ categoryById(id: $id){ id title level } }`,
      variables: { id: c1.id },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.categoryById.id).toBe(c1.id);
    expect(res.data.categoryById.title).toBe(c1.title);
  });

  test('mainCategories returns categories with level 0..2', async () => {
    const { c1, c2, c3 } = await seedCategoriesSimple();
    const res = await server.executeOperation({ query: `query { mainCategories { id title level } }` });
    expect(res.errors).toBeUndefined();
    const levels = res.data.mainCategories.map((c) => c.level);
    // Should include level 0 and 1, exclude level 3
    expect(levels).toEqual(expect.arrayContaining([c1.level, c2.level]));
    expect(levels).not.toContain(c3.level);
  });

  test('subCategories returns flattened tree including root and descendants', async () => {
    const { root, child, grand } = await seedCategoryTree();
    const res = await server.executeOperation({
      query: `query($id: ID!){ subCategories(id: $id){ id title } }`,
      variables: { id: root.id },
    });
    expect(res.errors).toBeUndefined();
    const ids = res.data.subCategories.map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining([root.id, child.id, grand.id]));
    expect(res.data.subCategories.length).toBe(3);
  });
});
