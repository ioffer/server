import { BrandRoleBaseAccessInvite } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const inviteDoc = {
  user: new mongoose.Types.ObjectId(),
  invited: new mongoose.Types.ObjectId(),
  invitedEmail: 'invitee@example.com',
  brand: new mongoose.Types.ObjectId(),
};

describe('BrandRoleBaseAccessInvite model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setBrandRoleBaseAccessInvite', async () => {
    const created = await BrandRoleBaseAccessInvite.create(inviteDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getBrandRoleBaseAccessInvite', async () => {
    const created = await BrandRoleBaseAccessInvite.create(inviteDoc);
    const found = await BrandRoleBaseAccessInvite.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.invitedEmail).toBe(inviteDoc.invitedEmail);
    expect(found.brand.toString()).toBe(inviteDoc.brand.toString());
  });

  it('deleteBrandRoleBaseAccessInvite', async () => {
    const created = await BrandRoleBaseAccessInvite.create(inviteDoc);
    await BrandRoleBaseAccessInvite.deleteOne({ _id: created._id });
    const missing = await BrandRoleBaseAccessInvite.findById(created._id);
    expect(missing).toBeNull();
  });
});
