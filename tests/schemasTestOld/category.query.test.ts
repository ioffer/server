import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import typeDefs from '../../schema/typeDefs.js';
import resolvers from '../../schema/resolver.js';
import { connect, cleanup, disconnect } from '../modelsTest/helpers.js';
import { Category } from '@models';
import * as models from '@models';

let server: ApolloServer;
let currentContext: Record<string, any> = {};

beforeAll(async () => {
  await connect();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  server = new ApolloServer({ schema });

  const rawExecute = (server.executeOperation as any).bind(server);
  (server as any).executeOperation = async (request: any) => {
    const base = (currentContext ?? {}) as Record<string, any>;
    const ctx = { req: {} as any, res: {} as any, user: null, ...(base || {}) } as Record<string, any>;
    if (ctx.user && ctx.user._id == null && ctx.user.id != null) {
      ctx.user = { ...ctx.user, _id: ctx.user.id };
    }
    ctx.isAuth = base.isAuth ?? Boolean(base.user);
    const res = await rawExecute(request, { contextValue: { ...ctx, ...models } });
    if (res.body.kind === 'single') return res.body.singleResult;
    throw new Error('Unexpected multipart response in tests');
  };
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await cleanup();
  currentContext = {};
});

async function seedCategoriesSimple() {
  const c1 = await Category.create({ title: 'Cat One', level: 0 } as any);
  const c2 = await Category.create({ title: 'Cat Two', level: 1 } as any);
  const c3 = await Category.create({ title: 'Cat Three', level: 3 } as any);
  return { c1, c2, c3 } as any;
}

async function seedCategoryTree() {
  // root -> child -> grandchild
  const root = await Category.create({ title: 'Root', level: 0 } as any);
  const child = await Category.create({ title: 'Child', level: 1, parentCategory: (root as any).id } as any);
  const grand = await Category.create({ title: 'Grand', level: 2, parentCategory: (child as any).id } as any);

  // Maintain explicit subCategories arrays so populate works
  (root as any).subCategories = [child.id];
  await root.save();
  const freshChild = (await Category.findById((child as any).id)) as any;
  freshChild.subCategories = [grand.id];
  await freshChild.save();

  return { root: await Category.findById((root as any).id), child: await Category.findById((child as any).id), grand: await Category.findById((grand as any).id) } as any;
}

describe('Category schema queries', () => {
  test('categories returns all categories', async () => {
    const { c1, c2, c3 } = await seedCategoriesSimple();
    const res = await server.executeOperation({ query: `query { categories { id title level } }` });
    expect(res.errors).toBeUndefined();
    const titles = (res.data as any).categories.map((c: any) => c.title);
    expect(titles).toEqual(expect.arrayContaining([c1.title, c2.title, c3.title]));
  });

  test('categoryById returns the requested category', async () => {
    const { c1 } = await seedCategoriesSimple();
    const res = await server.executeOperation({
      query: `query($id: ID!){ categoryById(id: $id){ id title level } }`,
      variables: { id: (c1 as any).id },
    });
    expect(res.errors).toBeUndefined();
    expect((res.data as any).categoryById.id).toBe((c1 as any).id);
    expect((res.data as any).categoryById.title).toBe((c1 as any).title);
  });

  test('mainCategories returns categories with level 0..2', async () => {
    const { c1, c2, c3 } = await seedCategoriesSimple();
    const res = await server.executeOperation({ query: `query { mainCategories { id title level } }` });
    expect(res.errors).toBeUndefined();
    const levels = (res.data as any).mainCategories.map((c: any) => c.level);
    // Should include level 0 and 1, exclude level 3
    expect(levels).toEqual(expect.arrayContaining([(c1 as any).level, (c2 as any).level]));
    expect(levels).not.toContain((c3 as any).level);
  });

  test('subCategories returns flattened tree including root and descendants', async () => {
    const { root, child, grand } = await seedCategoryTree();
    const res = await server.executeOperation({
      query: `query($id: ID!){ subCategories(id: $id){ id title } }`,
      variables: { id: (root as any).id },
    });
    expect(res.errors).toBeUndefined();
    const ids = (res.data as any).subCategories.map((c: any) => c.id);
    expect(ids).toEqual(expect.arrayContaining([(root as any).id, (child as any).id, (grand as any).id]));
    expect((res.data as any).subCategories.length).toBe(3);
  });
});
