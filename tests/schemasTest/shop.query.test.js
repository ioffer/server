const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../../schema/typeDefs.js');
const resolvers = require('../../schema/resolver.js');
const { connect, cleanup, disconnect } = require('../modelsTest/helpers');
const { User, Shop, RoleBaseAccess, ShopRoleBaseAccessInvite, UserSubscription, Brand } = require('../../models');
const { Roles, Status, Verified } = require('../../constants/enums');
const { emailShopInviteUrl } = require('../../utils/emailConfirmationUrl');

// Avoid actual emails and push notifications
jest.mock('../../utils/sendEmail', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../helpers/modelsHelpers', () => ({
  modelArrayManager: jest.fn().mockResolvedValue({ status: true, newArray: [], newArrayData: [] }),
}));

jest.mock('../../helpers/handleNotification', () => ({
  createNotification: jest.fn().mockResolvedValue(true),
  getAllUsersWithNotificationToken: jest.fn().mockResolvedValue([]),
  getAllModeratorsWithNotificationToken: jest.fn().mockResolvedValue([]),
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

async function seedShop(owner, overrides = {}) {
  const s = await Shop.create({
    name: overrides.name || `Shop ${Math.random().toString(36).slice(2, 7)}`,
    owner: owner.id,
    status: overrides.status || Status.DRAFT,
    verified: overrides.verified || Verified.PENDING,
    isBlocked: overrides.isBlocked || false,
    city: overrides.city || 'City',
    address: overrides.address || 'Addr',
    location: overrides.location || 'Loc',
    phoneNumber: overrides.phoneNumber || '111',
  });
  return await Shop.findById(s.id);
}

async function seedBrand(owner, overrides = {}) {
  const b = await Brand.create({
    name: overrides.name || `Brand ${Math.random().toString(36).slice(2, 7)}`,
    owner: owner.id,
    status: overrides.status || Status.DRAFT,
  });
  return await Brand.findById(b.id);
}

describe('Shop schema queries and mutations', () => {
  describe('Shop Queries (schema/shop/query.js)', () => {
    test('publishedShops returns only published shops', async () => {
      const owner = await seedUser();
      await seedShop(owner, { status: Status.PUBLISHED });
      await seedShop(owner, { status: Status.DRAFT });
      const res = await server.executeOperation({
        query: `query($opt: Options){ publishedShops(options: $opt){ shops { id status } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.publishedShops.shops.length).toBe(1);
      expect(res.data.publishedShops.shops[0].status).toBe(Status.PUBLISHED);
    });

    test('shopById returns published shop without auth', async () => {
      const owner = await seedUser();
      const pub = await seedShop(owner, { status: Status.PUBLISHED });
      const res = await server.executeOperation({
        query: `query($id: ID!){ shopById(id: $id){ id status name } }`,
        variables: { id: pub.id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.shopById.id).toBe(pub.id);
    });

    test('shopById returns unpublished shop for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      const draft = await seedShop(admin, { status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: admin.id, role: Roles.SUPER_ADMIN, type: Roles.SUPER_ADMIN } };
      const res = await server.executeOperation({
        query: `query($id: ID!){ shopById(id: $id){ id status } }`,
        variables: { id: draft.id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.shopById.id).toBe(draft.id);
    });

    test('shops returns user-accessible shops', async () => {
      const owner = await seedUser();
      const s1 = await seedShop(owner, {});
      owner.shops.push(s1.id);
      await owner.save();
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({
        query: `query($opt: Options){ shops(options: $opt){ shops { id name } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(res.errors).toBeUndefined();
      const ids = res.data.shops.shops.map((s) => s.id);
      expect(ids).toContain(s1.id);
    });

    test('allShops works for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      await seedShop(admin, { status: Status.DRAFT });
      await seedShop(admin, { status: Status.PUBLISHED });
      currentContext = { isAuth: true, user: { id: admin.id, role: Roles.SUPER_ADMIN, type: Roles.SUPER_ADMIN } };
      const resAll = await server.executeOperation({
        query: `query($opt: Options){ allShops(options: $opt){ shops { id } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(resAll.errors).toBeUndefined();
      expect(resAll.data.allShops.shops.length).toBeGreaterThanOrEqual(2);
    });

    test('searchPendingShops returns pending shops for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      await seedShop(admin, { status: Status.DRAFT, verified: Verified.PENDING });
      currentContext = { isAuth: true, user: { id: admin.id, role: Roles.SUPER_ADMIN, type: Roles.SUPER_ADMIN } };
      const resPending = await server.executeOperation({
        query: `query($opt: Options){ searchPendingShops(options: $opt){ shops { id verified } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(resPending.errors).toBeUndefined();
      expect(resPending.data.searchPendingShops.shops.length).toBeGreaterThanOrEqual(1);
      expect(resPending.data.searchPendingShops.shops.every((s)=> s.verified === Verified.PENDING)).toBe(true);
    });

    test('searchBlockedShops returns blocked shops for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      await seedShop(admin, { isBlocked: true });
      currentContext = { isAuth: true, user: { id: admin.id, role: Roles.SUPER_ADMIN, type: Roles.SUPER_ADMIN } };
      const resBlocked = await server.executeOperation({
        query: `query($opt: Options){ searchBlockedShops(options: $opt){ shops { id isBlocked } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(resBlocked.errors).toBeUndefined();
      expect(resBlocked.data.searchBlockedShops.shops.some((s) => s.isBlocked)).toBe(true);
    });

    test('moderatorsByShopId returns invites array', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, {});
      const invite = await ShopRoleBaseAccessInvite.create({
        user: owner.id,
        invitedEmail: 'mod@example.com',
        role: 'ADMIN',
        shop: shop.id,
        expiresAt: Date.now() + 86400000,
      });
      shop.roleBaseAccessInvites.push(invite.id);
      await shop.save();
      const res = await server.executeOperation({
        query: `query($id: ID!){ moderatorsByShopId(id: $id){ id invitedEmail role } }`,
        variables: { id: shop.id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.moderatorsByShopId.length).toBe(1);
      expect(res.data.moderatorsByShopId[0].invitedEmail).toBe('mod@example.com');
    });
  });

  describe('Shop Mutations (schema/shop/query.js)', () => {
    test('registerShop creates a shop for authenticated user', async () => {
      const owner = await seedUser();
      currentContext = { isAuth: true, user: { id: owner.id, _id: owner.id, fullName: owner.fullName } };
      const res = await server.executeOperation({
        query: `mutation($input: ShopInput!){
          registerShop(newShop: $input){ id name owner { id } status }
        }`,
        variables: {
          input: {
            name: 'My Shop',
            category: [],
            subCategory: [],
            phoneNumber: '111',
            location: 'Loc',
            address: 'Addr',
            city: 'City',
            status: Status.DRAFT,
          },
        },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.registerShop.name).toBe('My Shop');
      expect(res.data.registerShop.owner.id).toBe(owner.id);
    });

    test('editShop updates fields', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { name: 'Before' });
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };
      const res = await server.executeOperation({
        query: `mutation($id: ID!, $input: ShopInput!){
          editShop(id: $id, newShop: $input){ id name status }
        }`,
        variables: {
          id: shop.id,
          input: { name: 'After', category: [], subCategory: [], phoneNumber: '111', location: 'Loc', address: 'Addr', city: 'City', status: Status.DRAFT },
        },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.editShop.name).toBe('After');
    });

    test('archiveShop updates status to ARCHIVED', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };
      const resArch = await server.executeOperation({ query: `mutation($id: ID!){ archiveShop(id: $id) }`, variables: { id: shop.id } });
      expect(resArch.errors).toBeUndefined();
      expect(resArch.data.archiveShop).toBe(true);
      const refreshed = await Shop.findById(shop.id);
      expect(refreshed.status).toBe(Status.ARCHIVED);
    });

    test('unArchiveShop updates status to DRAFT', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.ARCHIVED });
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };
      const resUn = await server.executeOperation({ query: `mutation($id: ID!){ unArchiveShop(id: $id) }`, variables: { id: shop.id } });
      expect(resUn.errors).toBeUndefined();
      expect(resUn.data.unArchiveShop).toBe(true);
      const refreshed2 = await Shop.findById(shop.id);
      expect(refreshed2.status).toBe(Status.DRAFT);
    });

    test('verifyShop sets verified to VERIFIED for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      const shop = await seedShop(admin, { verified: Verified.PENDING });
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resVerify = await server.executeOperation({ query: `mutation($id: ID!){ verifyShop(id: $id) }`, variables: { id: shop.id } });
      expect(resVerify.errors).toBeUndefined();
      expect(resVerify.data.verifyShop).toBe(true);
      const v = await Shop.findById(shop.id);
      expect(v.verified).toBe(Verified.VERIFIED);
    });

    test('blockShop sets isBlocked true for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      const shop = await seedShop(admin, {});
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resBlock = await server.executeOperation({ query: `mutation($id: ID!){ blockShop(id: $id) }`, variables: { id: shop.id } });
      expect(resBlock.errors).toBeUndefined();
      expect(resBlock.data.blockShop).toBe(true);
      const b = await Shop.findById(shop.id);
      expect(b.isBlocked).toBe(true);
    });

    test('unblockShop sets isBlocked false for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      const shop = await seedShop(admin, { isBlocked: true });
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resUnblock = await server.executeOperation({ query: `mutation($id: ID!){ unblockShop(id: $id) }`, variables: { id: shop.id } });
      expect(resUnblock.errors).toBeUndefined();
      expect(resUnblock.data.unblockShop).toBe(true);
      const b2 = await Shop.findById(shop.id);
      expect(b2.isBlocked).toBe(false);
    });

    test('deleteShop marks status as DELETED', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ deleteShop(id: $id) }`, variables: { id: shop.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.deleteShop).toBe(true);
      const refreshed = await Shop.findById(shop.id);
      expect(refreshed.status).toBe(Status.DELETED);
    });

    test('toggleSubscribeShop subscribes user to a non-branded shop', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.PUBLISHED });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const resSub = await server.executeOperation({ query: `mutation($id: ID!){ toggleSubscribeShop(id: $id) }`, variables: { id: shop.id } });
      expect(resSub.errors).toBeUndefined();
      expect(resSub.data.toggleSubscribeShop).toBe(true);
      const subDoc = await UserSubscription.findById((await User.findById(owner.id)).subscriptions);
      expect(subDoc.shops.map(String)).toContain(shop.id);
    });

    test('clickShop increments clickCounts', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.PUBLISHED });
      const before = (await Shop.findById(shop.id)).clickCounts || 0;
      const res = await server.executeOperation({ query: `mutation($id: ID!){ clickShop(id: $id) }`, variables: { id: shop.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.clickShop).toBe(true);
      const after = (await Shop.findById(shop.id)).clickCounts;
      expect(after).toBe(before + 1);
    });

    test('viewShop increments viewCounts', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.PUBLISHED });
      const before = (await Shop.findById(shop.id)).viewCounts || 0;
      const res = await server.executeOperation({ query: `mutation($id: ID!){ viewShop(id: $id) }`, variables: { id: shop.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.viewShop).toBe(true);
      const after = (await Shop.findById(shop.id)).viewCounts;
      expect(after).toBe(before + 1);
    });

    test('inviteShopModerator and acceptShopInvite flow', async () => {
      const owner = await seedUser({ fullName: 'Shop Owner' });
      const invited = await seedUser({ fullName: 'Invited User', email: 'invited@example.com', userName: `inv_${Date.now()}` });
      const shop = await seedShop(owner, {});
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };

      // Invite moderator
      const resInvite = await server.executeOperation({
        query: `mutation($id: ID!, $email: String!, $role: String!){ inviteShopModerator(id: $id, email: $email, role: $role) }`,
        variables: { id: shop.id, email: invited.email, role: 'ADMIN' },
      });
      expect(resInvite.errors).toBeUndefined();
      expect(resInvite.data.inviteShopModerator).toBe(true);

      // Load invite to get token
      const inv = await ShopRoleBaseAccessInvite.findOne({ invitedEmail: invited.email, shop: shop.id, isDeleted: false });
      const url = await emailShopInviteUrl(inv);
      const token = url.split('/').pop();

      // Accept invite as invited user
      currentContext = { isAuth: true, user: { id: invited.id, email: invited.email, fullName: invited.fullName } };
      const resAccept = await server.executeOperation({ query: `mutation($token: String!){ acceptShopInvite(token: $token) }`, variables: { token } });
      expect(resAccept.errors).toBeUndefined();
      expect(resAccept.data.acceptShopInvite).toBe(true);

      // Ensure role relations updated
      const updatedShop = await Shop.findById(shop.id);
      const updatedInvited = await User.findById(invited.id);
      expect(updatedShop.admins.map(String)).toContain(updatedInvited.id);
    });

    test('removeShopModerator removes user role and invite links', async () => {
      const owner = await seedUser({ fullName: 'Shop Owner' });
      const invited = await seedUser({ fullName: 'Invited User', email: 'inv2@example.com', userName: `inv2_${Date.now()}` });
      const shop = await seedShop(owner, {});

      // Manually add invited user as ADMIN to simulate already joined
      shop.admins.push(invited.id);
      await shop.save();
      const rba = await RoleBaseAccess.findById(invited.roleBasedAccess);
      rba.admin.shops.push(shop.id);
      await rba.save();

      currentContext = { isAuth: true, user: { id: owner.id, email: owner.email, fullName: owner.fullName } };
      const resRemove = await server.executeOperation({
        query: `mutation($id: ID!, $email: String!, $role: String!){ removeShopModerator(id: $id, email: $email, role: $role) }`,
        variables: { id: shop.id, email: invited.email, role: Roles.ADMIN },
      });
      expect(resRemove.errors).toBeUndefined();
      expect(resRemove.data.removeShopModerator).toBe(true);

      const updatedShop = await Shop.findById(shop.id);
      expect(updatedShop.admins.map(String)).not.toContain(invited.id);
    });
  });
});
