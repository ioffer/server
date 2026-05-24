import { UserSubscription } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const subscriptionDoc = {
  user: new mongoose.Types.ObjectId(),
  startDate: new Date(0),
  endDate: new Date(24 * 60 * 60 * 1000),
};

describe('Subscription model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setSubscription', async () => {
    const created = await UserSubscription.create(subscriptionDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getSubscription', async () => {
    const created = await UserSubscription.create(subscriptionDoc);
    const found = await UserSubscription.findById(created._id);
    expect(found).toBeTruthy();
    expect(String(found._id)).toBe(String(created._id));
  });

  it('deleteSubscription', async () => {
    const created = await UserSubscription.create(subscriptionDoc);
    await UserSubscription.deleteOne({ _id: created._id });
    const missing = await UserSubscription.findById(created._id);
    expect(missing).toBeNull();
  });
});
