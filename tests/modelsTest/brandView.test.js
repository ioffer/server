import { BrandView } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const brandViewDoc = {
  brand: new mongoose.Types.ObjectId(),
  user: new mongoose.Types.ObjectId(),
};

describe('BrandView model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setBrandView', async () => {
    const created = await BrandView.create(brandViewDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getBrandView', async () => {
    const created = await BrandView.create(brandViewDoc);
    const found = await BrandView.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.brand.toString()).toBe(brandViewDoc.brand.toString());
    expect(found.user.toString()).toBe(brandViewDoc.user.toString());
  });

  it('deleteBrandView', async () => {
    const created = await BrandView.create(brandViewDoc);
    await BrandView.deleteOne({ _id: created._id });
    const missing = await BrandView.findById(created._id);
    expect(missing).toBeNull();
  });
});
