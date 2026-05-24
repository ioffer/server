const { ApolloServer } = require('apollo-server');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const typeDefs = require('../../schema/typeDefs.js');
const resolvers = require('../../schema/resolver.js');
const path = require('path');
const fs = require('fs');
const { connect, cleanup, disconnect } = require('../modelsTest/helpers');
const mediaResolver = require('../../schema/media/resolver.js');
const { Media } = require('../../models');
const { MediaTypes } = require('../../constants/enums');

let server;
let currentContext = {};

beforeAll(async () => {
  await connect();
  const schema = makeExecutableSchema({ typeDefs, resolvers });
  server = new ApolloServer({
    schema,
    context: () => ({ ...currentContext }),
  });
});

afterAll(async () => {
  await disconnect();
});

afterEach(async () => {
  await cleanup();
  currentContext = {};
});

function createUpload(filePath) {
  return Promise.resolve({
    filename: path.basename(filePath),
    mimetype: 'image/png',
    encoding: '7bit',
    createReadStream: () => fs.createReadStream(filePath),
  });
}

function resolveSavedPath(relativeReturned) {
  const relative = relativeReturned.startsWith('/') ? relativeReturned.slice(1) : relativeReturned;
  return path.join(__dirname, '../../uploads', relative.replace(/\\/g, '/'));
}

describe('Media schema queries and uploads (schema/media/query.js)', () => {
  test('greeting returns "Hello World!"', async () => {
    const res = await server.executeOperation({ query: `query { greeting }` });
    expect(res.errors).toBeUndefined();
    expect(res.data.greeting).toBe('Hello World!');
  });

  describe('Media upload resolvers', () => {
    const dummyUserCtx = { isAuth: true, user: { id: '000000000000000000000000' } };
    const sourcePath = path.join(__dirname, '../../uploads/user.png');

    test('singleUpload stores one file and returns Media doc', async () => {
      expect(fs.existsSync(sourcePath)).toBe(true);

      const result = await mediaResolver.Mutation.singleUpload(
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
      expect(saved.url.length).toBe(1);

      // Verify file exists on disk
      const savedPath = resolveSavedPath(saved.url[0]);
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
      const result = await mediaResolver.Mutation.multipleUpload(
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
      expect(saved.url.length).toBe(2);

      // Ensure each path exists, then cleanup
      for (const rel of saved.url) {
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
