import { Media } from '../../models';
import { connect, cleanup, disconnect } from './helpers';

const mediaDoc = {
  url: ['https://cdn.example.com/file.jpg'],
};

describe('Media model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setMedia', async () => {
    const created = await Media.create(mediaDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getMedia', async () => {
    const created = await Media.create(mediaDoc);
    const found = await Media.findById(created._id);
    expect(found).toBeTruthy();
    expect(Array.isArray(found.url)).toBe(true);
    expect(found.url[0]).toBe(mediaDoc.url[0]);
  });

  it('deleteMedia', async () => {
    const created = await Media.create(mediaDoc);
    await Media.deleteOne({ _id: created._id });
    const missing = await Media.findById(created._id);
    expect(missing).toBeNull();
  });
});
