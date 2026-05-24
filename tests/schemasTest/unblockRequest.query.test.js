const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../../schema/typeDefs.js');
const resolvers = require('../../schema/resolver.js');
const { connect, cleanup, disconnect } = require('../modelsTest/helpers');
const { User } = require('../../models');

let server;
let currentContext = {};

beforeAll(async () => {
  await connect();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  server = new ApolloServer({
    schema,
    context: () => ({
      // Provide both dynamic context and models, because unBlockRequest resolvers
      // destructure models from context in some mutations
      ...currentContext,
      ...require('../../models'),
    }),
  });
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await cleanup();
  currentContext = {};
});

async function seedBlockedUser() {
  const u = await User.create({
    fullName: 'Blocked User',
    userName: `blocked_${Date.now()}`,
    email: `blocked_${Date.now()}@example.com`,
    password: 'x',
    confirmed: true,
    isBlocked: true,
  });
  return await User.findById(u.id);
}

describe('UnBlockRequest schema queries and mutations', () => {
  test('createUnBlockRequest creates a request tied to the authenticated user', async () => {
    const blocked = await seedBlockedUser();
    currentContext = { user: { id: blocked.id } };

    const res = await server.executeOperation({
      query: `mutation($d: String!){
        createUnBlockRequest(description: $d){ id description user { id email } }
      }`,
      variables: { d: 'Please unblock me' },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.createUnBlockRequest.description).toBe('Please unblock me');
    expect(res.data.createUnBlockRequest.user.id).toBe(blocked.id);
  });

  test('unBlockRequests returns list including created request', async () => {
    const blocked = await seedBlockedUser();
    currentContext = { user: { id: blocked.id } };
    const createRes = await server.executeOperation({
      query: `mutation($d: String!){ createUnBlockRequest(description: $d){ id } }`,
      variables: { d: 'Request list' },
    });
    expect(createRes.errors).toBeUndefined();

    const res = await server.executeOperation({ query: `query { unBlockRequests { id description user { id } } }` });
    expect(res.errors).toBeUndefined();
    const ids = res.data.unBlockRequests.map((r) => r.id);
    expect(ids).toContain(createRes.data.createUnBlockRequest.id);
  });

  test('unBlockRequestById returns the specific request', async () => {
    const blocked = await seedBlockedUser();
    currentContext = { user: { id: blocked.id } };
    const createRes = await server.executeOperation({
      query: `mutation($d: String!){ createUnBlockRequest(description: $d){ id } }`,
      variables: { d: 'Find me' },
    });
    expect(createRes.errors).toBeUndefined();
    const id = createRes.data.createUnBlockRequest.id;

    const res = await server.executeOperation({
      query: `query($id: ID!){ unBlockRequestById(id: $id){ id description user { id } } }`,
      variables: { id },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.unBlockRequestById.id).toBe(id);
    expect(res.data.unBlockRequestById.user.id).toBe(blocked.id);
  });

  test('unBlockUser unblocks the targeted user and deletes the request (ADMIN required)', async () => {
    const blocked = await seedBlockedUser();
    // Create request as blocked user
    currentContext = { user: { id: blocked.id } };
    const createRes = await server.executeOperation({
      query: `mutation($d: String!){ createUnBlockRequest(description: $d){ id } }`,
      variables: { d: 'Admin please' },
    });
    expect(createRes.errors).toBeUndefined();
    const reqId = createRes.data.createUnBlockRequest.id;

    // Call unBlockUser as ADMIN
    currentContext = { user: { id: '000000000000000000000000', type: 'ADMIN' } };
    const res = await server.executeOperation({
      query: `mutation($id: ID!){ unBlockUser(id: $id) }`,
      variables: { id: reqId },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.unBlockUser).toBe(true);

    // Verify user is unblocked and request removed
    const freshUser = await User.findById(blocked.id);
    expect(freshUser.isBlocked).toBe(false);

    const getReq = await server.executeOperation({
      query: `query($id: ID!){ unBlockRequestById(id: $id){ id } }`,
      variables: { id: reqId },
    });
    // After deletion, fetch by id should return null
    expect(getReq.errors).toBeUndefined();
    expect(getReq.data.unBlockRequestById).toBeNull();
  });
});
