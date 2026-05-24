import { Shop } from '../../models';
import { connect, cleanup, disconnect } from './helpers';

const shopDoc = {
  name: 'ShopOne',
  email: 'shop@example.com',
  website: 'https://shop.example.com',
};

describe('Shop model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setShop', async () => {
    const created = await Shop.create(shopDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getShop', async () => {
    const created = await Shop.create(shopDoc);
    const found = await Shop.findById(created._id);
    expect(found.name).toBe(shopDoc.name);
    expect(found.email).toBe(shopDoc.email);
  });

  it('deleteShop', async () => {
    const created = await Shop.create(shopDoc);
    await Shop.deleteOne({ _id: created._id });
    const missing = await Shop.findById(created._id);
    expect(missing).toBeNull();
  });
});
