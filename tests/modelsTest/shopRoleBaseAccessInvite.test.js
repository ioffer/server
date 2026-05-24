import { ShopRoleBaseAccessInvite } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const inviteDoc = {
  user: new mongoose.Types.ObjectId(),
  invited: new mongoose.Types.ObjectId(),
  invitedEmail: 'shop-invitee@example.com',
  shop: new mongoose.Types.ObjectId(),
};

describe('ShopRoleBaseAccessInvite model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setShopRoleBaseAccessInvite', async () => {
    const created = await ShopRoleBaseAccessInvite.create(inviteDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getShopRoleBaseAccessInvite', async () => {
    const created = await ShopRoleBaseAccessInvite.create(inviteDoc);
    const found = await ShopRoleBaseAccessInvite.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.invitedEmail).toBe(inviteDoc.invitedEmail);
    expect(found.shop.toString()).toBe(inviteDoc.shop.toString());
  });

  it('deleteShopRoleBaseAccessInvite', async () => {
    const created = await ShopRoleBaseAccessInvite.create(inviteDoc);
    await ShopRoleBaseAccessInvite.deleteOne({ _id: created._id });
    const missing = await ShopRoleBaseAccessInvite.findById(created._id);
    expect(missing).toBeNull();
  });
});
