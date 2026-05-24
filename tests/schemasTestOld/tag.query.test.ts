import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import typeDefs from '../../schema/typeDefs.js';
import resolvers from '../../schema/resolver.js';
import { connect, cleanup, disconnect } from '../modelsTest/helpers.js';
import { Tag } from '@models';
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

async function seedTags() {
  const t1 = await Tag.create({ title: 'Electronics' } as any);
  const t2 = await Tag.create({ title: 'Fashion' } as any);
  const t3 = await Tag.create({ title: 'Grocery' } as any);
  return { t1: (await Tag.findById((t1 as any).id)) as any, t2: (await Tag.findById((t2 as any).id)) as any, t3: (await Tag.findById((t3 as any).id)) as any };
}

describe('Tag schema queries and mutations', () => {
  describe('Tag Queries (schema/tag/query.js)', () => {
    test('tags returns all tags', async () => {
      const { t1, t2, t3 } = await seedTags();
      const res = await server.executeOperation({ query: `query { tags { id title } }` });
      expect(res.errors).toBeUndefined();
      const titles = (res.data as any).tags.map((x: any) => x.title);
      expect(titles).toEqual(expect.arrayContaining([t1.title, t2.title, t3.title]));
    });

    test('tagById returns the requested tag', async () => {
      const { t1 } = await seedTags();
      const res = await server.executeOperation({
        query: `query($id: ID!){ tagById(id: $id){ id title } }`,
        variables: { id: (t1 as any).id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.tagById.id).toBe((t1 as any).id);
      expect(res.data.tagById.title).toBe((t1 as any).title);
    });

    test('tagByTitle returns a tag by its unique title', async () => {
      const { t2 } = await seedTags();
      const res = await server.executeOperation({
        query: `query($title: String!){ tagByTitle(title: $title){ id title } }`,
        variables: { title: (t2 as any).title },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.tagByTitle.id).toBe((t2 as any).id);
      expect(res.data.tagByTitle.title).toBe((t2 as any).title);
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
      const saved = await Tag.findOne({ title: 'Home' } as any);
      expect(saved).toBeTruthy();
    });

    test('createTag returns existing tag if title already exists (no duplicate)', async () => {
      const existing = await Tag.create({ title: 'Unique' } as any);
      currentContext = { user: { id: '000000000000000000000000' }, isAuth: true };
      const res = await server.executeOperation({
        query: `mutation($title: String!){ createTag(title: $title){ id title } }`,
        variables: { title: 'Unique' },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.createTag.id).toBe((existing as any).id);
      const count = await (Tag as any).countDocuments({ title: 'Unique' });
      expect(count).toBe(1);
    });
  });
});
