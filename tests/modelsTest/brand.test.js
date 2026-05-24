import { Brand } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

// Hardcoded brand document
const brandDoc = {
  name: 'Acme Corp',
  email: 'acme@example.com',
  website: 'https://acme.example.com',
  tags: ['retail'],
};

let createdId = null;

describe('Brand model', () => {
  beforeAll(async () => {
    await connect();
  });
  afterEach(async () => {
    await cleanup();
    createdId = null;
  });
  afterAll(async () => {
    await disconnect();
  });

  it('setBrand', async () => {
    const brand = new Brand(brandDoc);
    const saved = await brand.save();
    expect(saved && saved._id).toBeTruthy();
    createdId = saved._id;
  });

  it('getBrand', async () => {
    const created = await Brand.create(brandDoc); // ensure one exists
    const found = await Brand.findById(created._id);
    expect(found).toBeTruthy();
    expect(found.name).toBe(brandDoc.name);
    expect(found.email).toBe(brandDoc.email);
    expect(found.website).toBe(brandDoc.website);
    expect(Array.isArray(found.tags)).toBe(true);
  });

  it('deleteBrand', async () => {
    const created = await Brand.create(brandDoc);
    await Brand.deleteOne({ _id: created._id });
    const missing = await Brand.findById(created._id);
    expect(missing).toBeNull();
  });
});
