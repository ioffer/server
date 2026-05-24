import { Offer } from '../../models';
import { connect, cleanup, disconnect } from './helpers';

const offerDoc = {
  name: 'Limited Offer',
  description: 'Save 20% on select items',
};

describe('Offer model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setOffer', async () => {
    const created = await Offer.create(offerDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getOffer', async () => {
    const created = await Offer.create(offerDoc);
    const found = await Offer.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.name).toBe(offerDoc.name);
    expect(found.description).toBe(offerDoc.description);
  });

  it('deleteOffer', async () => {
    const created = await Offer.create(offerDoc);
    await Offer.deleteOne({ _id: created._id });
    const missing = await Offer.findById(created._id);
    expect(missing).toBeNull();
  });
});
