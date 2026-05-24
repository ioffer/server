import { Favorite } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const favoriteDoc = {
  user: new mongoose.Types.ObjectId(),
  shops: [new mongoose.Types.ObjectId()],
  brands: [new mongoose.Types.ObjectId()],
};

describe('Favorite model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setFavorite', async () => {
    const created = await Favorite.create(favoriteDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getFavorite', async () => {
    const created = await Favorite.create(favoriteDoc);
    const found = await Favorite.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.user.toString()).toBe(favoriteDoc.user.toString());
    expect(Array.isArray(found.shops)).toBe(true);
    expect(Array.isArray(found.brands)).toBe(true);
  });

  it('deleteFavorite', async () => {
    const created = await Favorite.create(favoriteDoc);
    await Favorite.deleteOne({ _id: created._id });
    const missing = await Favorite.findById(created._id);
    expect(missing).toBeNull();
  });
});
