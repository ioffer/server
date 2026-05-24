import { RoleBaseAccess } from '../../models';
import mongoose from 'mongoose';
import { connect, cleanup, disconnect } from './helpers';

const roleDoc = {
  admin: { brands: [new mongoose.Types.ObjectId()], shops: [new mongoose.Types.ObjectId()] },
  modifier: { brands: [], shops: [] },
  watcher: { brands: [], shops: [] },
};

describe('RoleBaseAccess model', () => {
  beforeAll(async () => { await connect(); });
  afterEach(async () => { await cleanup(); });
  afterAll(async () => { await disconnect(); });

  it('setRoleBaseAccess', async () => {
    const created = await RoleBaseAccess.create(roleDoc);
    expect(created && created._id).toBeTruthy();
  });

  it('getRoleBaseAccess', async () => {
    const created = await RoleBaseAccess.create(roleDoc);
    const found = await RoleBaseAccess.findById(created._id);
    expect(found).toBeTruthy();
    if (found.admin && Array.isArray(found.admin.brands)) {
      expect(found.admin.brands.length).toBe(roleDoc.admin.brands.length);
    }
  });

  it('deleteRoleBaseAccess', async () => {
    const created = await RoleBaseAccess.create(roleDoc);
    await RoleBaseAccess.deleteOne({ _id: created._id });
    const missing = await RoleBaseAccess.findById(created._id);
    expect(missing).toBeNull();
  });
});
