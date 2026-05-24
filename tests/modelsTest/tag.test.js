import { Tag } from '../../models';
import { connect, cleanup, disconnect } from './helpers';

const tagDoc = { title: 'Deals' };

describe('Tag model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setTag', async () => {
    const created = await Tag.create(tagDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getTag', async () => {
    const created = await Tag.create(tagDoc);
    const found = await Tag.findById(created._id);
    expect(found.title).toBe(tagDoc.title);
  });

  it('deleteTag', async () => {
    const created = await Tag.create(tagDoc);
    await Tag.deleteOne({ _id: created._id });
    const missing = await Tag.findById(created._id);
    expect(missing).toBeNull();
  });
});
