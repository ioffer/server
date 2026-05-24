 import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import typeDefs from '../../schema/typeDefs.js';
import resolvers from '../../schema/resolver.js';
import { connect, cleanup, disconnect } from '../modelsTest/helpers.js';
import { User, Notification, UserNotification } from '@models';
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

async function seedUsers() {
  const sender = await User.create({ fullName: 'Sender', userName: `sender_${Date.now()}`, email: `sender${Date.now()}@ex.com`, password: 'x', confirmed: true } as any);
  const receiver = await User.create({ fullName: 'Receiver', userName: `receiver_${Date.now()}`, email: `receiver${Date.now()}@ex.com`, password: 'x', confirmed: true } as any);
  return { sender: (await User.findById(sender.id)) as any, receiver: (await User.findById(receiver.id)) as any };
}

async function createNotifAndUserNotif(sender: any, receiver: any, extra: any = {}) {
  const n = await Notification.create({
    title: extra.title || 'Hello',
    description: extra.description || 'Desc',
    messageTitle: extra.messageTitle || 'MT',
    messageBody: extra.messageBody || 'MB',
    sender: sender.id,
    entityType: 'User',
    entity: sender.id,
    link: 'http://localhost',
  } as any);
  const un = await UserNotification.create({ notification: n.id, user: receiver.id } as any);
  return { n: (await Notification.findById(n.id)) as any, un: (await UserNotification.findById(un.id)) as any };
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

    const saved = await Notification.findOne({ sender: sender.id, entity: receiver.id } as any);
    expect(saved).toBeTruthy();
    expect((saved as any).title).toBe('Welcome');
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
      variables: { id: (un as any).id },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.userNotificationById.id).toBe((un as any).id);
    expect(res.data.userNotificationById.notification.title).toBe('Hello');
    expect(res.data.userNotificationById.notification.sender.id).toBe((sender as any).id);
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
      variables: { id: (un as any).id },
    });

    expect(res.errors).toBeUndefined();
    expect(res.data.viewNotification).toBe(true);
    const fresh = await UserNotification.findById((un as any).id);
    expect((fresh as any).isSeen).toBe(true);
  });

  test('deleteNotification marks a UserNotification as deleted and excludes it from listing', async () => {
    const { sender, receiver } = await seedUsers();
    const { un } = await createNotifAndUserNotif(sender, receiver);
    currentContext = { isAuth: true, user: { id: receiver.id } };

    const resDel = await server.executeOperation({
      query: `mutation($id: ID!){ deleteNotification(id: $id) }`,
      variables: { id: (un as any).id },
    });

    expect(resDel.errors).toBeUndefined();
    expect(resDel.data.deleteNotification).toBe(true);
    const deleted = await UserNotification.findById((un as any).id);
    expect((deleted as any).isDeleted).toBe(true);

    const resList = await server.executeOperation({
      query: `query($opt: Options){ listUserNotifications(options: $opt){ userNotifications { id } } }`,
      variables: { opt: { paginationOptions: { page: 1, limit: 10 } } },
    });
    const ids = resList.data.listUserNotifications.userNotifications.map((x: any) => x.id);
    expect(ids).not.toContain((un as any).id);
  });
});
