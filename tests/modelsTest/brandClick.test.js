import { BrandClick } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const brandClickDoc = {
  brand: new mongoose.Types.ObjectId(),
  user: new mongoose.Types.ObjectId(),
};

describe('BrandClick model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setBrandClick', async () => {
    const created = await BrandClick.create(brandClickDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getBrandClick', async () => {
    const created = await BrandClick.create(brandClickDoc);
    const found = await BrandClick.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.brand.toString()).toBe(brandClickDoc.brand.toString());
    expect(found.user.toString()).toBe(brandClickDoc.user.toString());
  });

  it('deleteBrandClick', async () => {
    const created = await BrandClick.create(brandClickDoc);
    await BrandClick.deleteOne({ _id: created._id });
    const missing = await BrandClick.findById(created._id);
    expect(missing).toBeNull();
  });
});
