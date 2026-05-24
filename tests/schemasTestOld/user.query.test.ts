import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import typeDefs from '../../schema/typeDefs.js';
import resolvers from '../../schema/resolver.js';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from '../modelsTest/helpers.js';
import { User } from '@models';
import { hash, compare } from 'bcryptjs';
import * as speakeasy from 'speakeasy';
import { emailConfirmationUrl } from '@utils/emailConfirmationUrl.js';
import { forgetPasswordUrl } from '@utils/forgetPasswordUrl.js';
import { Status, Roles } from '@constants/enums.js';

// Mock email sending to avoid network calls
jest.mock('@utils/sendEmail.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

// Helper to build Apollo Server for tests with dynamic context
let server: ApolloServer;
let currentContext: Record<string, any> = {};

beforeAll(async () => {
  // Ensure env has SECRET to avoid config import issues
  process.env.SECRET = process.env.SECRET || 'testsecret';

  await connect();

  const schema = makeExecutableSchema({ typeDefs, resolvers });
  server = new ApolloServer({ schema });

  // Wrap executeOperation to inject contextValue and unwrap the single result like Apollo v2/3
  const rawExecute = (server.executeOperation as any).bind(server);
  (server as any).executeOperation = async (request: any) => {
    const res = await rawExecute(request, {
      contextValue: { req: {} as any, res: {} as any, user: null, isAuth: false, ...(currentContext ?? {}) },
    });
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

async function seedUsers() {
  const passwordHash = await hash('Passw0rd!', 10);
  const base = {
    password: passwordHash,
    confirmed: true,
  };
  const [u1, u2, superAdmin, pendingKyc, blocked] = await Promise.all([
    User.create({ ...base, fullName: 'User One', userName: 'user1', email: 'user1@example.com' }),
    User.create({ ...base, fullName: 'User Two', userName: 'user2', email: 'user2@example.com' }),
    User.create({ ...base, fullName: 'Super Admin', userName: 'super', email: 'super@example.com', type: Roles.SUPER_ADMIN }),
    User.create({ ...base, fullName: 'Pending KYC', userName: 'kycuser', email: 'kyc@example.com', kyc: { kycStatus: Status.PENDING } }),
    User.create({ ...base, fullName: 'Blocked User', userName: 'blocked', email: 'blocked@example.com', isBlocked: true }),
  ]);
  return { u1, u2, superAdmin, pendingKyc, blocked };
}

describe('User schema queries and mutations', () => {

describe('User Queries (schema/user/query.js)', () => {
  test('version returns static version string', async () => {
    const res = await server.executeOperation({
      query: `query { version }`,
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.version).toBe('0.0.1');
  });

  test('users returns list of users', async () => {
    const { u1, u2 } = await seedUsers();
    const res = await server.executeOperation({ query: `query { users { id userName email } }` });
    expect(res.errors).toBeUndefined();
    // At least the two we seeded (others may exist depending on test order/cleanup)
    const names = res.data.users.map((u) => u.userName);
    expect(names).toEqual(expect.arrayContaining([u1.userName, u2.userName]));
  });

  test('userById returns the specific user', async () => {
    const { u1 } = await seedUsers();
    const res = await server.executeOperation({
      query: `query($id: ID!) { userById(id: $id) { id userName email } }`,
      variables: { id: u1.id },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.userById.id).toBe(u1.id);
    expect(res.data.userById.userName).toBe(u1.userName);
  });

  test('me returns current authenticated user', async () => {
    const { u1 } = await seedUsers();
    currentContext = { isAuth: true, user: { id: u1.id } };
    const res = await server.executeOperation({ query: `query { me { id userName email } }` });
    expect(res.errors).toBeUndefined();
    expect(res.data.me.id).toBe(u1.id);
  });

  test('authUser returns the user from request context', async () => {
    const { u1 } = await seedUsers();
    // Simulate req.user available in context
    currentContext = { user: { id: u1.id, userName: u1.userName, email: u1.email }, isAuth: true };
    const res = await server.executeOperation({ query: `query { authUser { id userName email } }` });
    expect(res.errors).toBeUndefined();
    expect(res.data.authUser.userName).toBe(u1.userName);
  });

  test('loginUser authenticates by username and returns token and user', async () => {
    const { u1 } = await seedUsers();
    const res = await server.executeOperation({
      query: `query($userName: String!, $password: String!) {
        loginUser(userName: $userName, password: $password) {
          token
          user { id userName email }
        }
      }`,
      variables: { userName: u1.userName, password: 'Passw0rd!' },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.loginUser.user.userName).toBe(u1.userName);
    expect(typeof res.data.loginUser.token).toBe('string');
    expect(res.data.loginUser.token.length).toBeGreaterThan(10);
  });

  test('verify2FA validates TOTP token', async () => {
    // Build a temporary user in context with a secret
    const secret = speakeasy.generateSecret({ name: 'IOfferTest' });
    const token = speakeasy.totp({ secret: secret.base32, encoding: 'base32' });
    currentContext = { user: { twoFactorSecret: secret.base32 } };
    const res = await server.executeOperation({
      query: `query($token: String!) { verify2FA(token: $token) }`,
      variables: { token },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.verify2FA).toBe(true);
  });

  test('searchPendingKyc returns users with pending KYC for SUPER_ADMIN', async () => {
    const { superAdmin, pendingKyc } = await seedUsers();
    currentContext = { user: { id: superAdmin.id, type: Roles.SUPER_ADMIN } };
    const res = await server.executeOperation({
      query: `query { searchPendingKyc { id userName kyc { kycStatus } } }`,
    });
    expect(res.errors).toBeUndefined();
    // Should include the pendingKyc user
    const ids = res.data.searchPendingKyc.map((u) => u.id);
    expect(ids).toEqual(expect.arrayContaining([pendingKyc.id]));
  });

  test('searchUnBlockedUsers returns confirmed and unblocked users for SUPER_ADMIN', async () => {
    const { superAdmin, pendingKyc, blocked } = await seedUsers();
    currentContext = { user: { id: superAdmin.id, type: Roles.SUPER_ADMIN } };
    const res = await server.executeOperation({
      query: `query { searchUnBlockedUsers { id userName confirmed } }`,
    });
    expect(res.errors).toBeUndefined();
    // Should include pendingKyc (confirmed by seed) and exclude blocked
    const names = res.data.searchUnBlockedUsers.map((u) => u.userName);
    expect(names).toContain(pendingKyc.userName);
    expect(names).not.toContain(blocked.userName);
  });
});



describe('User Mutations (schema/user/query.js)', () => {
  test('updateNotificationToken sets token and flag for authenticated user', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const u = await User.create({ fullName: 'Notif User', userName: 'notifuser', email: 'notif@example.com', password: passwordHash, confirmed: true });
    currentContext = { isAuth: true, user: { id: u.id } };
    const res = await server.executeOperation({
      query: `mutation($token: String) { updateNotificationToken(token: $token) }`,
      variables: { token: 'tok_123' },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.updateNotificationToken).toBe(true);
    const fresh = await User.findById(u.id);
    expect(fresh.notificationToken).toBe('tok_123');
    expect(fresh.haveNotificationToken).toBe(true);
  });

  test('enable2FA then disable2FA toggles twoFactor settings', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const u = await User.create({ fullName: 'TFA User', userName: 'tfauser', email: 'tfa@example.com', password: passwordHash, confirmed: true });
    currentContext = { user: { id: u.id } };
    const resEnable = await server.executeOperation({ query: `mutation { enable2FA { id twoFactorEnabled twoFactorSecret twoFactorCode } }` });
    expect(resEnable.errors).toBeUndefined();
    expect(resEnable.data.enable2FA.twoFactorEnabled).toBe(true);
    expect(resEnable.data.enable2FA.twoFactorSecret).toBeTruthy();
    expect(resEnable.data.enable2FA.twoFactorCode).toBeTruthy();

    const resDisable = await server.executeOperation({ query: `mutation { disable2FA }` });
    expect(resDisable.errors).toBeUndefined();
    expect(resDisable.data.disable2FA).toBe(true);
    const fresh = await User.findById(u.id);
    expect(fresh.twoFactorEnabled).toBe(false);
    expect(fresh.twoFactorSecret).toBe('');
  });

  test('registerUser creates a user and returns AuthUser with Bearer token', async () => {
    const unique = Date.now();
    const shortUser = `u${unique}`.slice(0, 10); // respect max 10 chars
    const res = await server.executeOperation({
      query: `mutation($input: UserRegisterInput!) {
        registerUser(newUser: $input) {
          token
          user { id email userName fullName }
        }
      }`,
      variables: {
        input: {
          fullName: 'Reg User',
          userName: shortUser,
          email: `reg${unique}@example.com`,
          password: 'Passw0rd!',
        },
      },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.registerUser.token.startsWith('Bearer ')).toBe(true);
    const saved = await User.findOne({ email: `reg${unique}@example.com` });
    expect(saved).toBeTruthy();
  });

  test('editUser updates user profile for authenticated user', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const u = await User.create({ fullName: 'Edit User', userName: 'edituser', email: 'edit@example.com', password: passwordHash, confirmed: true });
    currentContext = { user: { id: u.id } };
    const res = await server.executeOperation({
      query: `mutation($input: UserInput!) { editUser(newUser: $input) { id location } }`,
      variables: { input: { location: 'NYC' } },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.editUser.location).toBe('NYC');
    const fresh = await User.findById(u.id);
    expect(fresh.location).toBe('NYC');
  });

  test('confirmEmail confirms user using a valid token', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const u = await User.create({ fullName: 'Confirm User', userName: 'confirmuser', email: 'confirm@example.com', password: passwordHash, confirmed: false });
    const url = await emailConfirmationUrl({ id: u.id, email: u.email });
    const token = url.split('/').pop();
    const res = await server.executeOperation({
      query: `mutation($token: String!) { confirmEmail(token: $token) }`,
      variables: { token },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.confirmEmail).toBe(true);
    const fresh = await User.findById(u.id);
    expect(fresh.confirmed).toBe(true);
    expect(fresh.emailConfirmToken).toBe('');
  });

  test('forgetPassword sends reset email and stores reset token', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const u = await User.create({ fullName: 'FP User', userName: 'fpuser', email: 'fp@example.com', password: passwordHash, confirmed: true });
    const res = await server.executeOperation({
      query: `mutation($email: String!) { forgetPassword(email: $email) }`,
      variables: { email: u.email },
    });
    expect(res.errors).toBeUndefined();
    // sendEmail mocked to return true
    expect(res.data.forgetPassword).toBe(true);
    const fresh = await User.findById(u.id);
    expect(typeof fresh.resetPasswordToken).toBe('string');
    expect(fresh.resetPasswordToken.length).toBeGreaterThan(10);
  });

  test('resetPassword updates password when provided a valid token', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const u = await User.create({ fullName: 'RP User', userName: 'rpuser', email: 'rp@example.com', password: passwordHash, confirmed: true });
    const url = await forgetPasswordUrl({ id: u.id, email: u.email });
    const token = url.split('/').pop();
    const res = await server.executeOperation({
      query: `mutation($token: String!, $password: String!) { resetPassword(token: $token, password: $password) }`,
      variables: { token, password: 'NewPassw0rd!' },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.resetPassword).toBe(true);
    const fresh = await User.findById(u.id);
    const matches = await compare('NewPassw0rd!', fresh.password);
    expect(matches).toBe(true);
  });

  test('changePassword changes password for authenticated user with correct old password', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const u = await User.create({ fullName: 'CP User', userName: 'cpuser', email: 'cp@example.com', password: passwordHash, confirmed: true });
    const fullUser = await User.findById(u.id);
    currentContext = { user: { id: fullUser.id, password: fullUser.password } };
    const res = await server.executeOperation({
      query: `mutation($password: String!, $newPassword: String!) { changePassword(password: $password, newPassword: $newPassword) }`,
      variables: { password: 'Passw0rd!', newPassword: 'BrandNewP@ss1' },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.changePassword).toBe(true);
    const fresh = await User.findById(u.id);
    const matches = await compare('BrandNewP@ss1', fresh.password);
    expect(matches).toBe(true);
  });

  test('verifyKyc sets user KYC status to VERIFIED for SUPER_ADMIN', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const admin = await User.create({ fullName: 'Admin', userName: 'admin', email: 'admin@example.com', password: passwordHash, confirmed: true, type: Roles.SUPER_ADMIN });
    const target = await User.create({ fullName: 'Target', userName: 'target', email: 'target@example.com', password: passwordHash, confirmed: true, kyc: { kycStatus: Status.PENDING } });
    currentContext = { user: { id: admin.id, type: Roles.SUPER_ADMIN } };
    const res = await server.executeOperation({
      query: `mutation($id: ID!) { verifyKyc(id: $id) }`,
      variables: { id: target.id },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.verifyKyc).toBe(true);
    const fresh = await User.findById(target.id);
    expect(fresh.kyc.kycStatus).toBe(Status.VERIFIED);
  });

  test('cancelKyc sets user KYC status to REJECTED for SUPER_ADMIN', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const admin = await User.create({ fullName: 'Admin2', userName: 'admin2', email: 'admin2@example.com', password: passwordHash, confirmed: true, type: Roles.SUPER_ADMIN });
    const target = await User.create({ fullName: 'Target2', userName: 'target2', email: 'target2@example.com', password: passwordHash, confirmed: true, kyc: { kycStatus: Status.PENDING } });
    currentContext = { user: { id: admin.id, type: Roles.SUPER_ADMIN } };
    const res = await server.executeOperation({
      query: `mutation($id: ID!) { cancelKyc(id: $id) }`,
      variables: { id: target.id },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.cancelKyc).toBe(true);
    const fresh = await User.findById(target.id);
    expect(fresh.kyc.kycStatus).toBe(Status.REJECTED);
  });

  test('blockUser blocks a non-admin user by SUPER_ADMIN', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const admin = await User.create({ fullName: 'Admin3', userName: 'admin3', email: 'admin3@example.com', password: passwordHash, confirmed: true, type: Roles.SUPER_ADMIN });
    const target = await User.create({ fullName: 'Block Target', userName: 'blockme', email: 'blockme@example.com', password: passwordHash, confirmed: true });
    currentContext = { user: { id: admin.id, type: Roles.SUPER_ADMIN } };
    const res = await server.executeOperation({
      query: `mutation($id: ID!) { blockUser(id: $id) }`,
      variables: { id: target.id },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.blockUser).toBe(true);
    const fresh = await User.findById(target.id);
    expect(fresh.isBlocked).toBe(true);
  });

  test('deleteUser removes user and returns the deleted user', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const target = await User.create({ fullName: 'Delete Target', userName: 'deleteme', email: 'deleteme@example.com', password: passwordHash, confirmed: true });
    const res = await server.executeOperation({
      query: `mutation($id: String!) { deleteUser(id: $id) { id userName email } }`,
      variables: { id: target.id },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.deleteUser.id).toBe(target.id);
    const fresh = await User.findById(target.id);
    expect(fresh).toBeNull();
  });

  test('addKyc and editKyc set and update KYC data for authenticated user', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const u = await User.create({ fullName: 'KYC User', userName: 'kycuser2', email: 'kyc2@example.com', password: passwordHash, confirmed: true });
    currentContext = { user: { id: u.id } };
    const resAdd = await server.executeOperation({
      query: `mutation($id: String!) { addKyc(id: $id, mobile: "123", city: "Gotham", kycStatus: VERIFIED) { id kyc { mobile city kycStatus } } }`,
      variables: { id: u.id },
    });
    expect(resAdd.errors).toBeUndefined();
    expect(resAdd.data.addKyc.kyc.mobile).toBe('123');
    expect(resAdd.data.addKyc.kyc.city).toBe('Gotham');
    expect(resAdd.data.addKyc.kyc.kycStatus).toBe(Status.VERIFIED);

    const resEdit = await server.executeOperation({
      query: `mutation($id: String!) { editKyc(id: $id, street: "Main", building: "42" ) { id kyc { street building } } }`,
      variables: { id: u.id },
    });
    expect(resEdit.errors).toBeUndefined();
    expect(resEdit.data.editKyc.kyc.street).toBe('Main');
    expect(resEdit.data.editKyc.kyc.building).toBe('42');
  });

  test('createAdmin upgrades a user to SUPER_ADMIN by SUPER_ADMIN caller', async () => {
    const passwordHash = await hash('Passw0rd!', 10);
    const admin = await User.create({ fullName: 'Admin4', userName: 'admin4', email: 'admin4@example.com', password: passwordHash, confirmed: true, type: Roles.SUPER_ADMIN });
    const target = await User.create({ fullName: 'Admin Target', userName: 'admintarget', email: 'admintarget@example.com', password: passwordHash, confirmed: true });
    currentContext = { user: { id: admin.id, type: Roles.SUPER_ADMIN } };
    const res = await server.executeOperation({
      query: `mutation($email: String!) { createAdmin(email: $email) }`,
      variables: { email: target.email },
    });
    expect(res.errors).toBeUndefined();
    expect(res.data.createAdmin).toBe(true);
    const fresh = await User.findById(target.id);
    expect(fresh.type).toBe(Roles.SUPER_ADMIN);
  });
});

});
