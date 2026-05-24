import { ApolloServer } from '@apollo/server';
import { makeExecutableSchema } from '@graphql-tools/schema';
import typeDefs from '../../schema/typeDefs.js';
import resolvers from '../../schema/resolver.js';
import path from 'path';
import fs from 'fs';
import { connect, cleanup, disconnect } from '../modelsTest/helpers.js';
import mediaResolver from '../../schema/media/resolver.js';
import { Media } from '@models';
import { MediaTypes } from '@constants/enums.js';
import * as models from '@models';

let server: ApolloServer;
let currentContext: Record<string, any> = {};

beforeAll(async () => {
  await connect();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  server = new ApolloServer({ schema });
  const rawExecute = (server.executeOperation as any).bind(server);
  (server as any).executeOperation = async (request: any) => {
    const base = (currentContext ?? {}) as Record<string, any>;
    const ctx = { req: {} as any, res: {} as any, user: null, ...(base || {}) } as Record<string, any>;
    if (ctx.user && ctx.user._id == null && ctx.user.id != null) {
      ctx.user = { ...ctx.user, _id: ctx.user.id };
    }
    ctx.isAuth = base.isAuth ?? Boolean(base.user);
    const res = await rawExecute(request, { contextValue: { ...ctx, ...models } });
    if (res.body.kind === 'single') return res.body.singleResult;
    throw new Error('Unexpected multipart response in tests');
  };
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await cleanup();
  currentContext = {};
});

function createUpload(filePath: string) {
  return Promise.resolve({
    filename: path.basename(filePath),
    mimetype: 'image/png',
    encoding: '7bit',
    createReadStream: () => fs.createReadStream(filePath),
  });
}

function resolveSavedPath(relativeReturned: string) {
  const relative = relativeReturned.startsWith('/') ? relativeReturned.slice(1) : relativeReturned;
  return path.join(__dirname, '../../uploads', relative.replace(/\\/g, '/'));
}

describe('Media schema queries and uploads (schema/media/query.js)', () => {
  test('greeting returns "Hello World!"', async () => {
    const res = await (server as any).executeOperation({ query: `query { greeting }` });
    expect(res.errors).toBeUndefined();
    expect((res.data as any).greeting).toBe('Hello World!');
  });

  describe('Media upload resolvers', () => {
    const dummyUserCtx = { isAuth: true, user: { id: '000000000000000000000000' } };
    const sourcePath = path.join(__dirname, '../../uploads/user.png');

    test('singleUpload stores one file and returns Media doc', async () => {
      expect(fs.existsSync(sourcePath)).toBe(true);

      const result = await (mediaResolver as any).Mutation.singleUpload(
        null,
        { file: createUpload(sourcePath), mediaType: MediaTypes.IMAGE },
        dummyUserCtx
      );

      // Check shape
      expect(result).toBeTruthy();
      expect(result.id || result._id).toBeTruthy();
      expect(Array.isArray(result.url)).toBe(true);
      expect(result.url.length).toBe(1);
      expect(result.mediaType).toBe(MediaTypes.IMAGE);

      // Verify persisted in DB
      const saved = await Media.findById(result.id || result._id);
      expect(saved).toBeTruthy();
      expect((saved as any).url.length).toBe(1);

      // Verify file exists on disk
      const savedPath = resolveSavedPath((saved as any).url[0]);
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

    test('multipleUpload stores multiple files and returns Media doc with URLs array', async () => {
      expect(fs.existsSync(sourcePath)).toBe(true);

      const files = [createUpload(sourcePath), createUpload(sourcePath)];
      const result = await (mediaResolver as any).Mutation.multipleUpload(
        null,
        { files, mediaType: MediaTypes.IMAGE },
        dummyUserCtx
      );

      expect(result).toBeTruthy();
      expect(result.id || result._id).toBeTruthy();
      expect(Array.isArray(result.url)).toBe(true);
      expect(result.url.length).toBe(2);
      expect(result.mediaType).toBe(MediaTypes.IMAGE);

      const saved = await Media.findById(result.id || result._id);
      expect(saved).toBeTruthy();
      expect((saved as any).url.length).toBe(2);

      // Ensure each path exists, then cleanup
      for (const rel of (saved as any).url) {
        const p = resolveSavedPath(rel);
        const appeared = await new Promise((resolve) => {
          const start = Date.now();
          const check = () => {
            if (fs.existsSync(p)) return resolve(true);
            if (Date.now() - start > 3000) return resolve(false);
            setTimeout(check, 50);
          };
          check();
        });
        expect(appeared).toBe(true);
        try { fs.unlinkSync(p); } catch (e) {}
      }
    });
  });
});
