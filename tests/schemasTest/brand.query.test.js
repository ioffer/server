const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../../schema/typeDefs.js');
const resolvers = require('../../schema/resolver.js');
const { connect, cleanup, disconnect } = require('../modelsTest/helpers');
const { User, Brand, Category, Tag, RoleBaseAccess, BrandRoleBaseAccessInvite, UserSubscription } = require('../../models');
const { Roles, Status, Verified } = require('../../constants/enums');
const { emailBrandInviteUrl } = require('../../utils/emailConfirmationUrl');

// Avoid actual emails
jest.mock('../../utils/sendEmail', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));
// Stub array manager to avoid side-effects in tag/category linking during tests
jest.mock('../../helpers/modelsHelpers', () => ({
  modelArrayManager: jest.fn().mockResolvedValue({ status: true, newArray: [], newArrayData: [] }),
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
  // Ensure roleBasedAccess exists so brands query can populate it safely
  const rba = await RoleBaseAccess.create({ user: u.id });
  u.roleBasedAccess = rba.id;
  await u.save();
  return await User.findById(u.id); // return fresh instance
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
  return await Brand.findById(b.id);
}

async function seedTaxonomy() {
  const cat = await Category.create({ title: 'Cat A' });
  const sub = await Category.create({ title: 'Cat B' });
  const tag = await Tag.create({ title: 'Tag A' });
  return { cat, sub, tag };
}

describe('Brand schema queries and mutations', () => {
  describe('Brand Queries (schema/brand/query.js)', () => {
    test('publishedBrands returns only published brands', async () => {
      const owner = await seedUser();
      await seedBrand(owner, { status: Status.PUBLISHED });
      await seedBrand(owner, { status: Status.DRAFT });
      const res = await server.executeOperation({
        query: `query($opt: Options){ publishedBrands(options: $opt){ brands { id status } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.publishedBrands.brands.length).toBe(1);
      expect(res.data.publishedBrands.brands[0].status).toBe(Status.PUBLISHED);
    });

    test('brandById returns published brand without auth', async () => {
      const owner = await seedUser();
      const pub = await seedBrand(owner, { status: Status.PUBLISHED });
      const res = await server.executeOperation({
        query: `query($id: ID!){ brandById(id: $id){ id status name } }`,
        variables: { id: pub.id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.brandById.id).toBe(pub.id);
    });

    test('brandById returns unpublished brand for SUPER_ADMIN', async () => {
      const owner = await seedUser();
      const draft = await seedBrand(owner, { status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id, role: Roles.SUPER_ADMIN, type: Roles.SUPER_ADMIN } };
      const res = await server.executeOperation({
        query: `query($id: ID!){ brandById(id: $id){ id status } }`,
        variables: { id: draft.id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.brandById.id).toBe(draft.id);
    });

    test('brands returns user-accessible brands', async () => {
      const owner = await seedUser();
      const b1 = await seedBrand(owner, {});
      // grant access by pushing into user.brands
      owner.brands.push(b1.id);
      await owner.save();
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({
        query: `query($opt: Options){ brands(options: $opt){ brands { id name } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(res.errors).toBeUndefined();
      const ids = res.data.brands.brands.map((b) => b.id);
      expect(ids).toContain(b1.id);
    });

    test('allBrands works for SUPER_ADMIN', async () => {
      const admin = await seedUser({ fullName: 'Super', type: Roles.SUPER_ADMIN });
      await seedBrand(admin, { status: Status.DRAFT, verified: Verified.PENDING });
      await seedBrand(admin, { status: Status.DRAFT, verified: Verified.PENDING, isBlocked: true });
      currentContext = { isAuth: true, user: { id: admin.id, role: Roles.SUPER_ADMIN, type: Roles.SUPER_ADMIN } };
      const resAll = await server.executeOperation({
        query: `query($opt: Options){ allBrands(options: $opt){ brands { id } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(resAll.errors).toBeUndefined();
      expect(resAll.data.allBrands.brands.length).toBeGreaterThanOrEqual(2);
    });

    test('searchPendingBrands returns pending brands for SUPER_ADMIN', async () => {
      const admin = await seedUser({ fullName: 'Super', type: Roles.SUPER_ADMIN });
      await seedBrand(admin, { status: Status.DRAFT, verified: Verified.PENDING });
      currentContext = { isAuth: true, user: { id: admin.id, role: Roles.SUPER_ADMIN, type: Roles.SUPER_ADMIN } };
      const resPending = await server.executeOperation({
        query: `query($opt: Options){ searchPendingBrands(options: $opt){ brands { id verified } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(resPending.errors).toBeUndefined();
      expect(resPending.data.searchPendingBrands.brands.length).toBeGreaterThanOrEqual(1);
      expect(resPending.data.searchPendingBrands.brands.every((b)=> b.verified === Verified.PENDING)).toBe(true);
    });

    test('searchBlockedBrands returns blocked brands for SUPER_ADMIN', async () => {
      const admin = await seedUser({ fullName: 'Super', type: Roles.SUPER_ADMIN });
      await seedBrand(admin, { status: Status.DRAFT, verified: Verified.PENDING, isBlocked: true });
      currentContext = { isAuth: true, user: { id: admin.id, role: Roles.SUPER_ADMIN, type: Roles.SUPER_ADMIN } };
      const resBlocked = await server.executeOperation({
        query: `query($opt: Options){ searchBlockedBrands(options: $opt){ brands { id isBlocked } pagination { totalRecords } } }`,
        variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
      });
      expect(resBlocked.errors).toBeUndefined();
      expect(resBlocked.data.searchBlockedBrands.brands.some((b) => b.isBlocked)).toBe(true);
    });

    test('moderatorsByBrandId returns invites array', async () => {
      const owner = await seedUser();
      const brand = await seedBrand(owner, {});
      const invite = await BrandRoleBaseAccessInvite.create({
        user: owner.id,
        invitedEmail: 'mod@example.com',
        role: 'ADMIN',
        brand: brand.id,
        expiresAt: Date.now() + 86400000,
      });
      brand.roleBaseAccessInvites.push(invite.id);
      await brand.save();
      const res = await server.executeOperation({
        query: `query($id: ID!){ moderatorsByBrandId(id: $id){ id invitedEmail role } }`,
        variables: { id: brand.id },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.moderatorsByBrandId.length).toBe(1);
      expect(res.data.moderatorsByBrandId[0].invitedEmail).toBe('mod@example.com');
    });
  });

  describe('Brand Mutations (schema/brand/query.js)', () => {
    test('createBrand creates a brand for authenticated user', async () => {
      const owner = await seedUser();
      currentContext = { isAuth: true, user: { id: owner.id, _id: owner.id, fullName: owner.fullName } };
      const res = await server.executeOperation({
        query: `mutation($input: BrandInput!){
          createBrand(newBrand: $input){ id name owner { id } status }
        }`,
        variables: {
          input: {
            name: 'My Brand',
            email: 'b@example.com',
            category: [],
            subCategory: [],
            tags: [],
            phoneNumber: '111',
            mobileNumber: '222',
            status: Status.DRAFT,
          },
        },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.createBrand.name).toBe('My Brand');
      expect(res.data.createBrand.owner.id).toBe(owner.id);
    });

    test('editBrand updates fields', async () => {
      const owner = await seedUser();
      const { cat, sub, tag } = await seedTaxonomy();
      const brand = await seedBrand(owner, { name: 'Before' });
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };
      const res = await server.executeOperation({
        query: `mutation($id: ID!, $input: BrandInput!){
          editBrand(id: $id, newBrand: $input){ id name status }
        }`,
        variables: {
          id: brand.id,
          input: { name: 'After', category: [], subCategory: [], tags: [], phoneNumber: '111', mobileNumber: '222', status: Status.DRAFT },
        },
      });
      expect(res.errors).toBeUndefined();
      expect(res.data.editBrand.name).toBe('After');
    });

    test('archiveBrand updates status to ARCHIVED', async () => {
      const owner = await seedUser();
      const brand = await seedBrand(owner, { status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };
      const resArch = await server.executeOperation({
        query: `mutation($id: ID!){ archiveBrand(id: $id) }`,
        variables: { id: brand.id },
      });
      expect(resArch.errors).toBeUndefined();
      expect(resArch.data.archiveBrand).toBe(true);
      const refreshed = await Brand.findById(brand.id);
      expect(refreshed.status).toBe(Status.ARCHIVED);
    });

    test('unArchiveBrand updates status to DRAFT', async () => {
      const owner = await seedUser();
      const brand = await seedBrand(owner, { status: Status.ARCHIVED });
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };
      const resUn = await server.executeOperation({
        query: `mutation($id: ID!){ unArchiveBrand(id: $id) }`,
        variables: { id: brand.id },
      });
      expect(resUn.errors).toBeUndefined();
      expect(resUn.data.unArchiveBrand).toBe(true);
      const refreshed2 = await Brand.findById(brand.id);
      expect(refreshed2.status).toBe(Status.DRAFT);
    });

    test('verifyBrand sets verified to VERIFIED for SUPER_ADMIN', async () => {
      const admin = await seedUser({ fullName: 'Admin', type: Roles.SUPER_ADMIN });
      const brand = await seedBrand(admin, { verified: Verified.PENDING });
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resVerify = await server.executeOperation({ query: `mutation($id: ID!){ verifyBrand(id: $id) }`, variables: { id: brand.id } });
      expect(resVerify.errors).toBeUndefined();
      expect(resVerify.data.verifyBrand).toBe(true);
      const v = await Brand.findById(brand.id);
      expect(v.verified).toBe(Verified.VERIFIED);
    });

    test('blockBrand sets isBlocked true for SUPER_ADMIN', async () => {
      const admin = await seedUser({ fullName: 'Admin', type: Roles.SUPER_ADMIN });
      const brand = await seedBrand(admin, { verified: Verified.PENDING });
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resBlock = await server.executeOperation({ query: `mutation($id: ID!){ blockBrand(id: $id) }`, variables: { id: brand.id } });
      expect(resBlock.errors).toBeUndefined();
      expect(resBlock.data.blockBrand).toBe(true);
      const b = await Brand.findById(brand.id);
      expect(b.isBlocked).toBe(true);
    });

    test('unblockBrand sets isBlocked false for SUPER_ADMIN', async () => {
      const admin = await seedUser({ fullName: 'Admin', type: Roles.SUPER_ADMIN });
      const brand = await seedBrand(admin, { verified: Verified.PENDING, isBlocked: true });
      currentContext = { isAuth: true, user: { id: admin.id, type: Roles.SUPER_ADMIN, role: Roles.SUPER_ADMIN, fullName: admin.fullName } };
      const resUnblock = await server.executeOperation({ query: `mutation($id: ID!){ unblockBrand(id: $id) }`, variables: { id: brand.id } });
      expect(resUnblock.errors).toBeUndefined();
      expect(resUnblock.data.unblockBrand).toBe(true);
      const b2 = await Brand.findById(brand.id);
      expect(b2.isBlocked).toBe(false);
    });

    test('deleteBrand marks status as DELETED', async () => {
      const owner = await seedUser();
      const brand = await seedBrand(owner, { status: Status.DRAFT });
      currentContext = { isAuth: true, user: { id: owner.id } };
      const res = await server.executeOperation({ query: `mutation($id: ID!){ deleteBrand(id: $id) }`, variables: { id: brand.id } });
      expect(res.errors).toBeUndefined();
      expect(res.data.deleteBrand).toBe(true);
      const refreshed = await Brand.findById(brand.id);
      expect(refreshed.status).toBe(Status.DELETED);
    });

    test('toggleSubscribeBrand subscribes user', async () => {
      const owner = await seedUser();
      const brand = await seedBrand(owner, { status: Status.PUBLISHED });
      currentContext = { isAuth: true, user: { id: owner.id } };

      const resSub = await server.executeOperation({ query: `mutation($id: ID!){ toggleSubscribeBrand(id: $id) }`, variables: { id: brand.id } });
      expect(resSub.errors).toBeUndefined();
      expect(resSub.data.toggleSubscribeBrand).toBe(true);
      const subDoc = await UserSubscription.findById((await User.findById(owner.id)).subscriptions);
      expect(subDoc.brands.map(String)).toContain(brand.id);

    });

    test('inviteBrandModerator and acceptBrandInvite flow', async () => {
      const owner = await seedUser({ fullName: 'Brand Owner' });
      const invited = await seedUser({ fullName: 'Invited User', email: 'invited@example.com', userName: `inv_${Date.now()}` });
      const brand = await seedBrand(owner, {});
      currentContext = { isAuth: true, user: { id: owner.id, fullName: owner.fullName } };

      // Invite moderator
      const resInvite = await server.executeOperation({
        query: `mutation($id: ID!, $email: String!, $role: String!){ inviteBrandModerator(id: $id, email: $email, role: $role) }`,
        variables: { id: brand.id, email: invited.email, role: 'ADMIN' },
      });
      expect(resInvite.errors).toBeUndefined();
      expect(resInvite.data.inviteBrandModerator).toBe(true);

      // Load invite to get token
      const inv = await BrandRoleBaseAccessInvite.findOne({ invitedEmail: invited.email, brand: brand.id, isDeleted: false });
      const url = await emailBrandInviteUrl(inv);
      const token = url.split('/').pop();

      // Accept invite as invited user
      currentContext = { isAuth: true, user: { id: invited.id, email: invited.email, fullName: invited.fullName } };
      const resAccept = await server.executeOperation({ query: `mutation($token: String!){ acceptBrandInvite(token: $token) }`, variables: { token } });
      expect(resAccept.errors).toBeUndefined();
      expect(resAccept.data.acceptBrandInvite).toBe(true);

      // Ensure role relations updated
      const updatedBrand = await Brand.findById(brand.id);
      const updatedInvited = await User.findById(invited.id);
      expect(updatedBrand.admins.map(String)).toContain(updatedInvited.id);
    });
  });
});
