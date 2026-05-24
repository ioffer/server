import { Notification, User } from '../../models';
import { connect, cleanup, disconnect } from './helpers';
import { Models } from '../../constants/enums';

const userDoc = {
  fullName: 'Sender User',
  userName: 'sender_user_1',
  email: 'sender@example.com',
  password: 'secret',
};

describe('Notification model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setNotification', async () => {
    const sender = await User.create(userDoc);
    const notifDoc = {
      title: 'Hello',
      description: 'Desc',
      messageTitle: 'Hi',
      messageBody: 'Body',
      sender: sender._id,
      entityType: Models.User,
      entity: sender._id,
      link: '/users/' + String(sender._id),
    };
    const created = await Notification.create(notifDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getNotification', async () => {
    const sender = await User.create(userDoc);
    const notifDoc = {
      title: 'Hello',
      description: 'Desc',
      messageTitle: 'Hi',
      messageBody: 'Body',
      sender: sender._id,
      entityType: Models.User,
      entity: sender._id,
    };
    const created = await Notification.create(notifDoc);
    const found = await Notification.findById(created._id);
    expect(found.title).toBe('Hello');
    expect(found.sender.toString()).toBe(sender._id.toString());
    expect(found.entityType).toBe(Models.User);
    expect(found.entity.toString()).toBe(sender._id.toString());
  });

  it('deleteNotification', async () => {
    const sender = await User.create(userDoc);
    const notifDoc = {
      sender: sender._id,
      entityType: Models.User,
      entity: sender._id,
    };
    const created = await Notification.create(notifDoc);
    await Notification.deleteOne({ _id: created._id });
    const missing = await Notification.findById(created._id);
    expect(missing).toBeNull();
  });
});
