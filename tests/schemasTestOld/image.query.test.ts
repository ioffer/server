import path from 'path';
import fs from 'fs';
import { connect, cleanup, disconnect } from '../modelsTest/helpers.js';
import imageResolver from '../../schema/image/resolver.js';

beforeAll(async () => {
  await connect();
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await cleanup();
});

function createUpload(filePath: string) {
  return Promise.resolve({
    filename: path.basename(filePath),
    mimetype: 'image/png',
    encoding: '7bit',
    createReadStream: () => fs.createReadStream(filePath),
  });
}

describe('Image uploader resolver', () => {
  test('imageUploader uploads a file and returns relative path', async () => {
    const sourcePath = path.join(__dirname, '../../uploads/user.png');
    expect(fs.existsSync(sourcePath)).toBe(true);

    const returned = await (imageResolver as any).Mutation.imageUploader(
      null,
      { file: createUpload(sourcePath) },
      { isAuth: true, user: { id: '000000000000000000000000' } }
    );

    expect(typeof returned).toBe('string');
    expect(returned).toMatch(/\.png$/);

    const relative = (returned as string).startsWith('/') ? (returned as string).slice(1) : (returned as string);
    const savedPath = path.join(__dirname, '../../uploads', relative);

    // Wait for the async stream pipe to finish writing
    const appeared = await new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        if (fs.existsSync(savedPath)) return resolve(true);
        if (Date.now() - start > 3000) return resolve(false);
        setTimeout(check, 50);
      };
      check();
    });

    expect(appeared).toBe(true);

    // Cleanup created file
    try { fs.unlinkSync(savedPath); } catch (e) {}
  });
});
