import { UnBlockRequest } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const unBlockRequestDoc = {
  user: new mongoose.Types.ObjectId(),
  description: 'Please unblock my account.',
};

describe('UnBlockRequest model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setUnBlockRequest', async () => {
    const created = await UnBlockRequest.create(unBlockRequestDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getUnBlockRequest', async () => {
    const created = await UnBlockRequest.create(unBlockRequestDoc);
    const found = await UnBlockRequest.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.description).toBe(unBlockRequestDoc.description);
  });

  it('deleteUnBlockRequest', async () => {
    const created = await UnBlockRequest.create(unBlockRequestDoc);
    await UnBlockRequest.deleteOne({ _id: created._id });
    const missing = await UnBlockRequest.findById(created._id);
    expect(missing).toBeNull();
  });
});
