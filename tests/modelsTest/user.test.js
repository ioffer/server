import { User } from '../../models';
import { connect, cleanup, disconnect } from './helpers';

const userDoc = {
  fullName: 'John Doe',
  userName: 'john_doe_1',
  email: 'john@example.com',
  password: 'secret',
};

describe('User model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setUser', async () => {
    const created = await User.create(userDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getUser', async () => {
    const created = await User.create(userDoc);
    const found = await User.findById(created._id);
    expect(found.fullName).toBe(userDoc.fullName);
    expect(found.userName).toBe(userDoc.userName);
    expect(found.email).toBe(userDoc.email);
  });

  it('deleteUser', async () => {
    const created = await User.create(userDoc);
    await User.deleteOne({ _id: created._id });
    const missing = await User.findById(created._id);
    expect(missing).toBeNull();
  });
});
