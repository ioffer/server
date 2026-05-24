import { UserNotification, Notification, User } from '../../models';
import { connect, cleanup, disconnect } from './helpers';
import { Models } from '../../constants/enums';

describe('UserNotification model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setUserNotification', async () => {
    const user = await User.create({ fullName: 'N User', userName: 'n_user_1', email: 'nuser@example.com', password: 'x' });
    const notif = await Notification.create({ sender: user._id, entityType: Models.User, entity: user._id });
    const created = await UserNotification.create({ user: user._id, notification: notif._id, isSeen: false });
    expect(created && created._id).toBeTruthy();
  });

  it('getUserNotification', async () => {
    const user = await User.create({ fullName: 'N User2', userName: 'n_user_2', email: 'nuser2@example.com', password: 'x' });
    const notif = await Notification.create({ sender: user._id, entityType: Models.User, entity: user._id });
    const created = await UserNotification.create({ user: user._id, notification: notif._id, isSeen: true });
    const found = await UserNotification.findById(created._id);
    expect(found.user.toString()).toBe(user._id.toString());
    expect(found.notification.toString()).toBe(notif._id.toString());
    expect(found.isSeen).toBe(true);
  });

  it('deleteUserNotification', async () => {
    const user = await User.create({ fullName: 'N User3', userName: 'n_user_3', email: 'nuser3@example.com', password: 'x' });
    const notif = await Notification.create({ sender: user._id, entityType: Models.User, entity: user._id });
    const created = await UserNotification.create({ user: user._id, notification: notif._id });
    await UserNotification.deleteOne({ _id: created._id });
    const missing = await UserNotification.findById(created._id);
    expect(missing).toBeNull();
  });
});
