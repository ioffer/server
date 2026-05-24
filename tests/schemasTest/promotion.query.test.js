const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../../schema/typeDefs.js');
const resolvers = require('../../schema/resolver.js');
const { connect, cleanup, disconnect } = require('../modelsTest/helpers');
const { User, Brand, Shop, Promotion, RoleBaseAccess } = require('../../models');
const { Roles, Status, Verified } = require('../../constants/enums');

// Avoid external side effects from notification helpers used by promotion resolver
jest.mock('../../helpers/handleNotification', () => ({
  createNotification: jest.fn().mockResolvedValue(true),
  getAllUsersWithNotificationToken: jest.fn().mockResolvedValue([]),
}));

let server;
let currentContext = {};

beforeAll(async () => {
  process.env.SECRET = process.env.SECRET || 'testsecret';
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

async function seedUser(base = {}) {
  const u = await User.create({
    fullName: base.fullName || 'Owner User',
    userName: base.userName || `owner_${Date.now()}`,
    email: base.email || `owner${Date.now()}@example.com`,
    password: 'x',
    confirmed: true,
    type: base.type,
  });
  const rba = await RoleBaseAccess.create({ user: u.id });
  u.roleBasedAccess = rba.id;
  await u.save();
  return await User.findById(u.id);
}

async function seedBrand(owner, overrides = {}) {
  const b = await Brand.create({
    name: overrides.name || `Brand ${Math.random().toString(36).slice(2, 7)}`,
    email: overrides.email || `brand${Date.now()}@example.com`,
    owner: owner.id,
    status: overrides.status || Status.DRAFT,
    verified: overrides.verified || Verified.PENDING,
    isBlocked: overrides.isBlocked || false,
  });
  // Link brand to owner on user doc so promotions query can populate and collect promotions
  const freshOwner = await User.findById(owner.id);
  freshOwner.brands = Array.from(new Set([...(freshOwner.brands || []), b.id]));
  await freshOwner.save();
  return await Brand.findById(b.id);
}

async function seedShop(owner, overrides = {}) {
  const s = await Shop.create({
    name: overrides.name || `Shop ${Math.random().toString(36).slice(2, 7)}`,
    owner: owner.id,
    status: overrides.status || Status.DRAFT,
    brand: overrides.brand || undefined,
  });
  const freshOwner = await User.findById(owner.id);
  freshOwner.shops = Array.from(new Set([...(freshOwner.shops || []), s.id]));
  await freshOwner.save();
  return await Shop.findById(s.id);
}

async function createPromotionViaMutation(ctxUser, input) {
  currentContext = { isAuth: true, user: { id: ctxUser.id, _id: ctxUser.id, fullName: ctxUser.fullName, type: ctxUser.type } };
  const res = await server.executeOperation({
    query: `mutation($input: PromotionInput!){
      createPromotion(newPromotion: $input){ id name status verified publisher { id } }
    }`,
    variables: { input },
  });
  expect(res.errors).toBeUndefined();
  return res.data.createPromotion;
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
      const statuses = res.data.publishedPromotions.promotions.map((p) => p.status);
      expect(statuses.every((s) => s === Status.PUBLISHED)).toBe(true);
    });

    test('promotionById returns the promotion by id', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, {
        name: 'ById', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT,
      });
      const res = await server.executeOperation({
        query: `query($id: ID!){ promotionById(id: $id){ id name status } }`,
        variables: { id: promo.id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.promotionById.id).toBe(promo.id);
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
      const ids = res.data.promotions.promotions.map((p) => p.id);
      expect(ids).toContain(created.id);
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
      expect(promo.name).toBe('New Promo');
      const saved = await Promotion.findById(promo.id);
      expect(saved).toBeTruthy();
      // Ensure shop contains the promotion id (resolver updates it)
      const freshShop = await Shop.findById(shop.id);
      expect(freshShop.promotions.map(String)).toContain(saved.id);
    });

    test('editPromotion updates fields', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'EditMe', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });

      currentContext = { isAuth: true, user: { id: owner.id, _id: owner.id } };
      const res = await server.executeOperation({
        query: `mutation($id: ID!, $input: PromotionInput!){ editPromotion(id: $id, newPromotion: $input){ id name status } }`,
        variables: { id: promo.id, input: { name: 'Edited', media: [], description: 'd', price: '2', shops: [shop.id], status: Status.DRAFT } },
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
      const res = await server.executeOperation({ query: `mutation($id: ID!){ verifyPromotion(id: $id) }`, variables: { id: promo.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.verifyPromotion).toBe(true);
      const saved = await Promotion.findById(promo.id);
      expect(saved.verified).toBe(Verified.VERIFIED);
    });

    test('archivePromotion sets status to ARCHIVED', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'Arch', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ archivePromotion(id: $id) }`, variables: { id: promo.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.archivePromotion).toBe(true);
      const saved = await Promotion.findById(promo.id);
      expect(saved.status).toBe(Status.ARCHIVED);
    });

    test('unArchivePromotion sets status to DRAFT', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'UnArch', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.ARCHIVED });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ unArchivePromotion(id: $id) }`, variables: { id: promo.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.unArchivePromotion).toBe(true);
      const saved = await Promotion.findById(promo.id);
      expect(saved.status).toBe(Status.DRAFT);
    });

    test('deletePromotion sets status to DELETED', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'DeleteMe', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ deletePromotion(id: $id) }`, variables: { id: promo.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.deletePromotion).toBe(true);
      const saved = await Promotion.findById(promo.id);
      expect(saved.status).toBe(Status.DELETED);
    });

    test('clickPromotion increments clickCounts', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'Clicks', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });
      const before = (await Promotion.findById(promo.id)).clickCounts;
      const res = await server.executeOperation({ query: `mutation($id: ID!){ clickPromotion(id: $id) }`, variables: { id: promo.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.clickPromotion).toBe(true);
      const after = (await Promotion.findById(promo.id)).clickCounts;
      expect(after).toBe(before + 1);
    });

    test('viewPromotion increments viewCounts', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner);
      const promo = await createPromotionViaMutation(owner, { name: 'Views', media: [], description: 'd', price: '1', shops: [shop.id], status: Status.DRAFT });
      const before = (await Promotion.findById(promo.id)).viewCounts;
      const res = await server.executeOperation({ query: `mutation($id: ID!){ viewPromotion(id: $id) }`, variables: { id: promo.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.viewPromotion).toBe(true);
      const after = (await Promotion.findById(promo.id)).viewCounts;
      expect(after).toBe(before + 1);
    });
  });
});
