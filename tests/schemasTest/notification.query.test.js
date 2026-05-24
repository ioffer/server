const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../../schema/typeDefs.js');
const resolvers = require('../../schema/resolver.js');
const { connect, cleanup, disconnect } = require('../modelsTest/helpers');
const { User, Notification, UserNotification } = require('../../models');

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

async function seedUsers() {
  const sender = await User.create({ fullName: 'Sender', userName: `sender_${Date.now()}`, email: `sender${Date.now()}@ex.com`, password: 'x', confirmed: true });
  const receiver = await User.create({ fullName: 'Receiver', userName: `receiver_${Date.now()}`, email: `receiver${Date.now()}@ex.com`, password: 'x', confirmed: true });
  return { sender: await User.findById(sender.id), receiver: await User.findById(receiver.id) };
}

async function createNotifAndUserNotif(sender, receiver, extra = {}) {
  const n = await Notification.create({
    title: extra.title || 'Hello',
    description: extra.description || 'Desc',
    messageTitle: extra.messageTitle || 'MT',
    messageBody: extra.messageBody || 'MB',
    sender: sender.id,
    entityType: 'User',
    entity: sender.id,
    link: 'http://localhost',
  });
  const un = await UserNotification.create({ notification: n.id, user: receiver.id });
  return { n: await Notification.findById(n.id), un: await UserNotification.findById(un.id) };
}

describe('Notification schema queries and mutations', () => {
  test('createNotification creates a notification and returns true', async () => {
    const { sender, receiver } = await seedUsers();
    currentContext = { isAuth: true, user: { id: sender.id } };

    const res = await server.executeOperation({
      query: `mutation($input: NotificationInput!){ createNotification(newNotification: $input) }`,
      variables: { input: { title: 'Welcome', description: 'New', messageTitle: 'MsgT', messageBody: 'MsgB', entityType: 'User', entity: receiver.id, link: 'http://localhost' } },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.createNotification).toBe(true);

    const saved = await Notification.findOne({ sender: sender.id, entity: receiver.id });
    expect(saved).toBeTruthy();
    expect(saved.title).toBe('Welcome');
  });

  test('userNotificationById returns a UserNotification with nested notification, sender and entityData', async () => {
    const { sender, receiver } = await seedUsers();
    const { n, un } = await createNotifAndUserNotif(sender, receiver);
    currentContext = { isAuth: true, user: { id: receiver.id } };

    const res = await server.executeOperation({
      query: `query($id: ID!){
        userNotificationById(id: $id){
          id
          isSeen
          isDeleted
          user { id email }
          notification {
            title
            messageTitle
            sender { id email }
            entityData { __typename ... on User { id email } }
          }
        }
      }`,
      variables: { id: un.id },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.userNotificationById.id).toBe(un.id);
    expect(res.data.userNotificationById.notification.title).toBe('Hello');
    expect(res.data.userNotificationById.notification.sender.id).toBe(sender.id);
    expect(res.data.userNotificationById.notification.entityData.__typename).toBe('User');
  });

  test('listUserNotifications returns non-deleted notifications for the authenticated user with pagination', async () => {
    const { sender, receiver } = await seedUsers();
    await createNotifAndUserNotif(sender, receiver, { title: 'A' });
    await createNotifAndUserNotif(sender, receiver, { title: 'B' });
    currentContext = { isAuth: true, user: { id: receiver.id } };

    const res = await server.executeOperation({
      query: `query($opt: Options){
        listUserNotifications(options: $opt){
          userNotifications { id isDeleted isSeen notification { title } }
          pagination { totalRecords limit currentPage }
        }
      }`,
      variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.listUserNotifications.userNotifications.length).toBe(2);
    expect(res.data.listUserNotifications.pagination.limit).toBe(10);
  });

  test('viewNotification marks a UserNotification as seen', async () => {
    const { sender, receiver } = await seedUsers();
    const { un } = await createNotifAndUserNotif(sender, receiver);
    currentContext = { isAuth: true, user: { id: receiver.id } };

    const res = await server.executeOperation({
      query: `mutation($id: ID!){ viewNotification(id: $id) }`,
      variables: { id: un.id },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.viewNotification).toBe(true);
    const fresh = await UserNotification.findById(un.id);
    expect(fresh.isSeen).toBe(true);
  });

  test('deleteNotification marks a UserNotification as deleted and excludes it from listing', async () => {
    const { sender, receiver } = await seedUsers();
    const { un } = await createNotifAndUserNotif(sender, receiver);
    currentContext = { isAuth: true, user: { id: receiver.id } };

    const resDel = await server.executeOperation({
      query: `mutation($id: ID!){ deleteNotification(id: $id) }`,
      variables: { id: un.id },
    });

    expect(resDel.errors).toBeUndefined();
    expect(resDel.data.deleteNotification).toBe(true);
    const deleted = await UserNotification.findById(un.id);
    expect(deleted.isDeleted).toBe(true);

    const resList = await server.executeOperation({
      query: `query($opt: Options){ listUserNotifications(options: $opt){ userNotifications { id } } }`,
      variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
    });
    const ids = resList.data.listUserNotifications.userNotifications.map((x) => x.id);
    expect(ids).not.toContain(un.id);
  });
});
