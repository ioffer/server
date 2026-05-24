import { Pin } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const pinDoc = {
  user: new mongoose.Types.ObjectId(),
};

describe('Pin model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setPin', async () => {
    const created = await Pin.create(pinDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getPin', async () => {
    const created = await Pin.create(pinDoc);
    const found = await Pin.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.user.toString()).toBe(pinDoc.user.toString());
  });

  it('deletePin', async () => {
    const created = await Pin.create(pinDoc);
    await Pin.deleteOne({ _id: created._id });
    const missing = await Pin.findById(created._id);
    expect(missing).toBeNull();
  });
});
