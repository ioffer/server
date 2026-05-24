import { ShopView } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const shopViewDoc = {
  shop: new mongoose.Types.ObjectId(),
  user: new mongoose.Types.ObjectId(),
};

describe('ShopView model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setShopView', async () => {
    const created = await ShopView.create(shopViewDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getShopView', async () => {
    const created = await ShopView.create(shopViewDoc);
    const found = await ShopView.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.shop.toString()).toBe(shopViewDoc.shop.toString());
    expect(found.user.toString()).toBe(shopViewDoc.user.toString());
  });

  it('deleteShopView', async () => {
    const created = await ShopView.create(shopViewDoc);
    await ShopView.deleteOne({ _id: created._id });
    const missing = await ShopView.findById(created._id);
    expect(missing).toBeNull();
  });
});
