import { Category } from '../../models';
import { connect, cleanup, disconnect } from './helpers';

const categoryDoc = { title: 'Electronics' };

describe('Category model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setCategory', async () => {
    const created = await Category.create(categoryDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getCategory', async () => {
    const created = await Category.create(categoryDoc);
    const found = await Category.findById(created._id);
    expect(found.title).toBe(categoryDoc.title);
  });

  it('deleteCategory', async () => {
    const created = await Category.create(categoryDoc);
    await Category.deleteOne({ _id: created._id });
    const missing = await Category.findById(created._id);
    expect(missing).toBeNull();
  });
});
