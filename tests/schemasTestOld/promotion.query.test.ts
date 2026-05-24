import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import typeDefs from '../../schema/typeDefs.js';
import resolvers from '../../schema/resolver.js';
import { connect, cleanup, disconnect } from '../modelsTest/helpers.js';
import { User, Brand, Shop, Promotion, RoleBaseAccess } from '@models';
import { Roles, Status, Verified } from '@constants/enums.js';
import * as models from '@models';

// Avoid external side effects from notification helpers used by promotion resolver
jest.mock('@helpers/handleNotification.js', () => ({
  createNotification: jest.fn().mockResolvedValue(true),
  getAllUsersWithNotificationToken: jest.fn().mockResolvedValue([]),
}));

let server: ApolloServer;
let currentContext: Record<string, any> = {};

beforeAll(async () => {
  process.env.SECRET = process.env.SECRET || 'testsecret';
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

async function seedUser(base: any = {}) {
  const u = await User.create({
    fullName: base.fullName || 'Owner User',
    userName: base.userName || `owner_${Date.now()}`,
    email: base.email || `owner${Date.now()}@example.com`,
    password: 'x',
    confirmed: true,
    type: base.type,
  } as any);
  const rba = await RoleBaseAccess.create({ user: (u as any).id } as any);
  (u as any).roleBasedAccess = (rba as any).id;
  await u.save();
  return (await User.findById((u as any).id)) as any;
}

async function seedBrand(owner: any, overrides: any = {}) {
  const b = await Brand.create({
    name: overrides.name || `Brand ${Math.random().toString(36).slice(2, 7)}`,
    email: overrides.email || `brand${Date.now()}@example.com`,
    owner: owner.id,
    status: overrides.status || Status.DRAFT,
    verified: overrides.verified || Verified.PENDING,
    isBlocked: overrides.isBlocked || false,
  } as any);
  // Link brand to owner on user doc so promotions query can populate and collect promotions
  const freshOwner = (await User.findById(owner.id)) as any;
  freshOwner.brands = Array.from(new Set([...(freshOwner.brands || []), (b as any).id]));
  await freshOwner.save();
  return (await Brand.findById((b as any).id)) as any;
}

async function seedShop(owner: any, overrides: any = {}) {
  const s = await Shop.create({
    name: overrides.name || `Shop ${Math.random().toString(36).slice(2, 7)}`,
    owner: owner.id,
    status: overrides.status || Status.DRAFT,
    brand: overrides.brand || undefined,
  } as any);
  const freshOwner = (await User.findById(owner.id)) as any;
  freshOwner.shops = Array.from(new Set([...(freshOwner.shops || []), (s as any).id]));
  await freshOwner.save();
  return (await Shop.findById((s as any).id)) as any;
}

async function createPromotionViaMutation(ctxUser: any, input: any) {
  currentContext = { isAuth: true, user: { id: ctxUser.id, _id: ctxUser.id, fullName: ctxUser.fullName, type: ctxUser.type } };
  const res = await server.executeOperation({
    query: `mutation($input: PromotionInput!){
      createPromotion(newPromotion: $input){ id name status verified publisher { id } }
    }`,
    variables: { input },
  });
  expect(res.errors).toBeUndefined();
  return (res.data as any).createPromotion;
}

describe('Promotion schema queries and mutations (schema/promotion/query.js)', () => {
  describe('Promotion Queries', () => {
    test('publishedPromotions returns only PUBLISHED promotions', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      // One published
      await createPromotionViaMutation(owner, {
        name: 'Pub Promo',
        media: [],
        description: 'd',
        price: '1',
        shops: [shop.id],
        status: Status.PUBLISHED,
      });
      // One draft
      await createPromotionViaMutation(owner, {
        name: 'Draft Promo',
        media: [],
        description: 'd',
        price: '1',
        shops: [shop.id],
        status: Status.DRAFT,
      });

      const res = await server.executeOperation({
        query: `query($opt: Options){ publishedPromotions(options: $opt){ promotions { id status } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(res.errors).toBeUndefined();
      const statuses = (res.data as any).publishedPromotions.promotions.map((p: any) => p.status);
      expect(statuses.every((s: any) => s === Status.PUBLISHED)).toBe(true);
    });

    test('promotionById returns the promotion by id', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, {
        name: 'ById', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT,
      });
      const res = await server.executeOperation({
        query: `query($id: ID!){ promotionById(id: $id){ id name status } }`,
        variables: { id: (promo as any).id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.promotionById.id).toBe((promo as any).id);
      expect(res.data.promotionById.name).toBe('ById');
    });

    test('promotions returns user-accessible promotions (auth required)', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const created = await createPromotionViaMutation(owner, {
        name: 'Mine', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT,
      });
      // Query with auth
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({
        query: `query($opt: Options){ promotions(options: $opt){ promotions { id name } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(res.errors).toBeUndefined();
      const ids = (res.data as any).promotions.promotions.map((p: any) => p.id);
      expect(ids).toContain((created as any).id);
    });
  });

  describe('Promotion Mutations', () => {
    test('createPromotion creates a promotion for OWNER of the shop', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, {
        name: 'New Promo',
        media: [],
        description: 'desc',
        price: '100',
        shops: [shop.id],
        status: Status.DRAFT,
      });
      expect((promo as any).name).toBe('New Promo');
      const saved = await Promotion.findById((promo as any).id);
      expect(saved).toBeTruthy();
      // Ensure shop contains the promotion id (resolver updates it)
      const freshShop = await Shop.findById((shop as any).id);
      expect(((freshShop as any).promotions as any[]).map(String)).toContain((saved as any).id);
    });

    test('editPromotion updates fields', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'EditMe', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });

      currentContext = { isAuth: true, user: { id: owner.id, _id: owner.id } };
      const res = await server.executeOperation({
        query: `mutation($id: ID!, $input: PromotionInput!){ editPromotion(id: $id, newPromotion: $input){ id name status } }`,
        variables: { id: (promo as any).id, input: { name: 'Edited', media: [], description: 'd', price: '2', shops: [shop.id], status: Status.DRAFT } },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.editPromotion.name).toBe('Edited');
    });

    test('verifyPromotion sets verified to VERIFIED for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN, fullName: 'Admin' });
      const owner = await seedUser({ fullName: 'Owner2' });
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'Verify', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });

      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ verifyPromotion(id: $id) }`, variables: { id: (promo as any).id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.verifyPromotion).toBe(true);
      const saved = await Promotion.findById((promo as any).id);
      expect((saved as any).verified).toBe(Verified.VERIFIED);
    });

    test('archivePromotion sets status to ARCHIVED', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'Arch', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ archivePromotion(id: $id) }`, variables: { id: (promo as any).id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.archivePromotion).toBe(true);
      const saved = await Promotion.findById((promo as any).id);
      expect((saved as any).status).toBe(Status.ARCHIVED);
    });

    test('unArchivePromotion sets status to DRAFT', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'UnArch', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.ARCHIVED });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ unArchivePromotion(id: $id) }`, variables: { id: (promo as any).id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.unArchivePromotion).toBe(true);
      const saved = await Promotion.findById((promo as any).id);
      expect((saved as any).status).toBe(Status.DRAFT);
    });

    test('deletePromotion sets status to DELETED', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'DeleteMe', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ deletePromotion(id: $id) }`, variables: { id: (promo as any).id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.deletePromotion).toBe(true);
      const saved = await Promotion.findById((promo as any).id);
      expect((saved as any).status).toBe(Status.DELETED);
    });

    test('clickPromotion increments clickCounts', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'Clicks', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });
      const before = ((await Promotion.findById((promo as any).id)) as any).clickCounts;
      const res = await server.executeOperation({ query: `mutation($id: ID!){ clickPromotion(id: $id) }`, variables: { id: (promo as any).id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.clickPromotion).toBe(true);
      const after = ((await Promotion.findById((promo as any).id)) as any).clickCounts;
      expect(after).toBe(before + 1);
    });

    test('viewPromotion increments viewCounts', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'Views', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });
      const before = ((await Promotion.findById((promo as any).id)) as any).viewCounts;
      const res = await server.executeOperation({ query: `mutation($id: ID!){ viewPromotion(id: $id) }`, variables: { id: (promo as any).id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.viewPromotion).toBe(true);
      const after = ((await Promotion.findById((promo as any).id)) as any).viewCounts;
      expect(after).toBe(before + 1);
    });
  });
});
