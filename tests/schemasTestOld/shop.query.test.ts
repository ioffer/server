import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import typeDefs from '../../schema/typeDefs.js';
import resolvers from '../../schema/resolver.js';
import { connect, cleanup, disconnect } from '../modelsTest/helpers.js';
import { User, Shop, RoleBaseAccess, ShopRoleBaseAccessInvite, Subscription as UserSubscription, Brand } from '@models';
import { Roles, Status, Verified } from '@constants/enums.js';
import { emailShopInviteUrl } from '@utils/emailConfirmationUrl.js';
import * as models from '@models';

// Avoid actual emails and push notifications
jest.mock('@utils/sendEmail.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('@helpers/modelsHelpers.js', () => ({
  modelArrayManager: jest.fn().mockResolvedValue({ status: true, newArray: [], newArrayData: [] }),
}));

jest.mock('@helpers/handleNotification.js', () => ({
  createNotification: jest.fn().mockResolvedValue(true),
  getAllUsersWithNotificationToken: jest.fn().mockResolvedValue([]),
  getAllModeratorsWithNotificationToken: jest.fn().mockResolvedValue([]),
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

async function seedShop(owner: any, overrides: any = {}) {
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
  } as any);
  return (await Shop.findById((s as any).id)) as any;
}

async function seedBrand(owner: any, overrides: any = {}) {
  const b = await Brand.create({
    name: overrides.name || `Brand ${Math.random().toString(36).slice(2, 7)}`,
    owner: owner.id,
    status: overrides.status || Status.DRAFT,
  } as any);
  return (await Brand.findById((b as any).id)) as any;
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
      (owner as any).shops.push(s1.id);
      await owner.save();
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({
        query: `query($opt: Options){ shops(options: $opt){ shops { id name } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(res.errors).toBeUndefined();
      const ids = res.data.shops.shops.map((s: any) => s.id);
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
      expect(resPending.data.searchPendingShops.shops.every((s: any)=> s.verified === Verified.PENDING)).toBe(true);
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
      expect(resBlocked.data.searchBlockedShops.shops.some((s: any) => s.isBlocked)).toBe(true);
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
      } as any);
      (shop as any).roleBaseAccessInvites.push(invite.id);
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
      expect((refreshed as any).status).toBe(Status.ARCHIVED);
    });

    test('unArchiveShop updates status to DRAFT', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.ARCHIVED });
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };
      const resUn = await server.executeOperation({ query: `mutation($id: ID!){ unArchiveShop(id: $id) }`, variables: { id: shop.id } });
      expect(resUn.errors).toBeUndefined();
      expect(resUn.data.unArchiveShop).toBe(true);
      const refreshed2 = await Shop.findById(shop.id);
      expect((refreshed2 as any).status).toBe(Status.DRAFT);
    });

    test('verifyShop sets verified to VERIFIED for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      const shop = await seedShop(admin, { verified: Verified.PENDING });
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resVerify = await server.executeOperation({ query: `mutation($id: ID!){ verifyShop(id: $id) }`, variables: { id: shop.id } });
      expect(resVerify.errors).toBeUndefined();
      expect(resVerify.data.verifyShop).toBe(true);
      const v = await Shop.findById(shop.id);
      expect((v as any).verified).toBe(Verified.VERIFIED);
    });

    test('blockShop sets isBlocked true for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      const shop = await seedShop(admin, {});
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resBlock = await server.executeOperation({ query: `mutation($id: ID!){ blockShop(id: $id) }`, variables: { id: shop.id } });
      expect(resBlock.errors).toBeUndefined();
      expect(resBlock.data.blockShop).toBe(true);
      const b = await Shop.findById(shop.id);
      expect((b as any).isBlocked).toBe(true);
    });

    test('unblockShop sets isBlocked false for SUPER_ADMIN', async () => {
      const admin = await seedUser({ type: Roles.SUPER_ADMIN });
      const shop = await seedShop(admin, { isBlocked: true });
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resUnblock = await server.executeOperation({ query: `mutation($id: ID!){ unblockShop(id: $id) }`, variables: { id: shop.id } });
      expect(resUnblock.errors).toBeUndefined();
      expect(resUnblock.data.unblockShop).toBe(true);
      const b2 = await Shop.findById(shop.id);
      expect((b2 as any).isBlocked).toBe(false);
    });

    test('deleteShop marks status as DELETED', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ deleteShop(id: $id) }`, variables: { id: shop.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.deleteShop).toBe(true);
      const refreshed = await Shop.findById(shop.id);
      expect((refreshed as any).status).toBe(Status.DELETED);
    });

    test('toggleSubscribeShop subscribes user to a non-branded shop', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.PUBLISHED });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const resSub = await server.executeOperation({ query: `mutation($id: ID!){ toggleSubscribeShop(id: $id) }`, variables: { id: shop.id } });
      expect(resSub.errors).toBeUndefined();
      expect(resSub.data.toggleSubscribeShop).toBe(true);
      const subDoc = await UserSubscription.findById(((await User.findById(owner.id)) as any).subscriptions);
      expect(((subDoc as any).shops as any[]).map(String)).toContain(shop.id);
    });

    test('clickShop increments clickCounts', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.PUBLISHED });
      const before = ((await Shop.findById(shop.id)) as any).clickCounts || 0;
      const res = await server.executeOperation({ query: `mutation($id: ID!){ clickShop(id: $id) }`, variables: { id: shop.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.clickShop).toBe(true);
      const after = ((await Shop.findById(shop.id)) as any).clickCounts;
      expect(after).toBe(before + 1);
    });

    test('viewShop increments viewCounts', async () => {
      const owner = await seedUser();
      const shop = await seedShop(owner, { status: Status.PUBLISHED });
      const before = ((await Shop.findById(shop.id)) as any).viewCounts || 0;
      const res = await server.executeOperation({ query: `mutation($id: ID!){ viewShop(id: $id) }`, variables: { id: shop.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.viewShop).toBe(true);
      const after = ((await Shop.findById(shop.id)) as any).viewCounts;
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
      const inv = await ShopRoleBaseAccessInvite.findOne({ invitedEmail: invited.email, shop: shop.id, isDeleted: false } as any);
      const url = await emailShopInviteUrl(inv as any);
      const token = (url as string).split('/').pop();

      // Accept invite as invited user
      currentContext = { isAuth: true, user: { id: invited.id, email: invited.email, fullName: invited.fullName } };
      const resAccept = await server.executeOperation({ query: `mutation($token: String!){ acceptShopInvite(token: $token) }`, variables: { token } });
      expect(resAccept.errors).toBeUndefined();
      expect(resAccept.data.acceptShopInvite).toBe(true);

      // Ensure role relations updated
      const updatedShop = await Shop.findById(shop.id);
      const updatedInvited = await User.findById(invited.id);
      expect(((updatedShop as any).admins as any[]).map(String)).toContain((updatedInvited as any).id);
    });

    test('removeShopModerator removes user role and invite links', async () => {
      const owner = await seedUser({ fullName: 'Shop Owner' });
      const invited = await seedUser({ fullName: 'Invited User', email: 'inv2@example.com', userName: `inv2_${Date.now()}` });
      const shop = await seedShop(owner, {});

      // Manually add invited user as ADMIN to simulate already joined
      (shop as any).admins.push(invited.id);
      await shop.save();
      const rba = await RoleBaseAccess.findById((invited as any).roleBasedAccess);
      (rba as any).admin.shops.push(shop.id);
      await rba.save();

      currentContext = { isAuth: true, user: { id: owner.id, email: owner.email, fullName: owner.fullName } };
      const resRemove = await server.executeOperation({
        query: `mutation($id: ID!, $email: String!, $role: String!){ removeShopModerator(id: $id, email: $email, role: $role) }`,
        variables: { id: shop.id, email: invited.email, role: Roles.ADMIN },
      });
      expect(resRemove.errors).toBeUndefined();
      expect(resRemove.data.removeShopModerator).toBe(true);

      const updatedShop = await Shop.findById(shop.id);
      expect(((updatedShop as any).admins as any[]).map(String)).not.toContain(invited.id);
    });
  });
});
