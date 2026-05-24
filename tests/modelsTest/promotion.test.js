import { Promotion } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const promotionDoc = {
  name: 'Promo One',
  description: 'Promo description',
  brand: new mongoose.Types.ObjectId(),
};

describe('Promotion model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setPromotion', async () => {
    const created = await Promotion.create(promotionDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getPromotion', async () => {
    const created = await Promotion.create(promotionDoc);
    const found = await Promotion.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.name).toBe(promotionDoc.name);
    if (found.brand) {
      expect(found.brand.toString()).toBe(promotionDoc.brand.toString());
    }
  });

  it('deletePromotion', async () => {
    const created = await Promotion.create(promotionDoc);
    await Promotion.deleteOne({ _id: created._id });
    const missing = await Promotion.findById(created._id);
    expect(missing).toBeNull();
  });
});
