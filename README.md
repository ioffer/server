# Modern Node.js Backend Setup Guide

This guide walks you through modernizing a Node.js backend for speed, scalability, and developer experience.

---

## 1. Platform & Runtime
- **Upgrade Node.js** → use Node 20 or 22 LTS (faster V8, stable `fetch`, built-in test runner).
- **Drop Babel** → unnecessary now, switch to TypeScript with **tsup** (esbuild) or **swc**.
- **Package manager** → use **pnpm** (faster, space-efficient).

---

## 2. HTTP Framework & Server
- Use **Fastify** instead of Express (faster, schema-based, modern ecosystem).
- Use **pino** for structured JSON logging.

```ts
import Fastify from 'fastify';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

const app = Fastify({ logger: true });
await app.register(helmet);
await app.register(rateLimit, { max: 200, timeWindow: '1 minute' });

app.get('/health', async () => ({ ok: true }));

await app.listen({ port: 3000 });
```

---

## 3. GraphQL vs REST
- **GraphQL isn’t always faster than REST.**
- GraphQL pros: flexible queries, less over-fetching, APQ support.
- GraphQL cons: risk of N+1 queries, heavy resolvers, slower if unoptimized.
- REST pros: cacheable with CDNs, simple, great for public APIs.
- **Recommendation**:
  - Use **tRPC** if you control frontend + backend (super fast, type-safe).
  - Use **GraphQL (Mercurius)** if you need flexible queries/multiple clients.
  - Use **REST** for simple, cache-heavy APIs.

---

## 4. GraphQL Modernization
- Replace Apollo Server 3 with **Mercurius** or **GraphQL Yoga**.
- Add **DataLoader/Mercurius loaders** to batch DB queries (fix N+1).
- Use **Persisted Queries** + **Query depth/complexity limits**.
- Map GraphQL selection sets → DB projections to avoid over-fetching.

---

## 5. MongoDB Performance Checklist
- Use **`.lean()`** on queries to skip hydration.
- Add **indexes** on filter/sort fields.
- Use **projections** to only fetch requested fields.
- Apply **connection pooling**.
- Prefer **aggregation pipelines** for joins/complex queries.

---

## 6. Developer Experience
- Adopt **TypeScript (strict)**.
- Runtime validation → **Zod** or Fastify JSON schema.
- Testing → **Vitest** (faster than Jest).
- Linting/formatting → **Biome** or ESLint + Prettier.

---

## 7. Caching & Rate Limiting
- Use **Redis (ioredis)** for hot-path caching.
- Add **HTTP caching** (ETag, Cache-Control).
- Use in-memory **LRU cache** for ultra-hot lookups.

---

## 8. Observability
- **OpenTelemetry** for tracing.
- **Prometheus metrics** with `fastify-metrics`.
- JSON logs with **pino**.
- Load testing with **autocannon**, profiling with **clinic.js**.

---

## 9. Processes & Scaling
- Run in **Docker**, scale with Kubernetes/Nomad.
- Use **BullMQ (Redis)** for background jobs.
- For CPU-heavy tasks → **Worker Threads** or separate microservice.

---

## 10. Static Assets & CSS
- Don’t compile SCSS in the backend.
- Prebuild CSS in frontend pipeline.

---

## Example `package.json`

```json
{
  "name": "backend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20.0.0" },
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsup src/server.ts --format esm --dts --clean",
    "start": "node dist/server.js",
    "test": "vitest run",
    "lint": "biome lint .",
    "format": "biome format --write ."
  },
  "dependencies": {
    "@fastify/helmet": "^13.0.0",
    "@fastify/rate-limit": "^10.0.0",
    "fastify": "^5.0.0",
    "mercurius": "^14.0.0",
    "pino": "^9.0.0",
    "zod": "^3.23.8",
    "dotenv": "^16.4.5",
    "mongoose": "^8.0.0",
    "ioredis": "^5.4.1",
    "lru-cache": "^11.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "tsx": "^4.19.0",
    "tsup": "^8.1.0",
    "vitest": "^2.0.0",
    "biome": "^1.8.3"
  }
}
```

---

## GraphQL Example with Loaders

```ts
import mercurius from 'mercurius';
import { makeExecutableSchema } from '@graphql-tools/schema';
import DataLoader from 'dataloader';
import { UserModel, PostModel } from './models';

const typeDefs = `
  type User { id: ID!, name: String!, posts: [Post!]! }
  type Post { id: ID!, title: String!, authorId: ID! }
  type Query { user(id: ID!): User, postsByUser(userId: ID!): [Post!]! }
`;

const resolvers = {
  Query: {
    user: (_, { id }) => UserModel.findById(id).lean(),
    postsByUser: (_, { userId }, { loaders }) => loaders.postsByUser.load(userId),
  },
  User: {
    posts: (user, _, { loaders }) => loaders.postsByUser.load(user._id.toString()),
  }
};

export async function registerGraphQL(app) {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  app.register(mercurius, {
    schema,
    graphiql: process.env.NODE_ENV !== 'production',
    context: () => ({
      loaders: {
        postsByUser: new DataLoader(async (userIds) => {
          const posts = await PostModel.find({ authorId: { $in: userIds } }).lean();
          const map = Object.fromEntries(userIds.map(id => [id, []]));
          for (const p of posts) map[p.authorId]?.push(p);
          return userIds.map(id => map[id] ?? []);
        }),
      }
    }),
    queryDepth: 10,
    disableIntrospection: process.env.NODE_ENV === 'production'
  });
}
```

---

## Immediate Wins for Your Project
1. Upgrade Node → 20/22 and switch to pnpm.  
2. Remove Babel, use TypeScript + tsx/tsup.  
3. Migrate Express → Fastify, Apollo → Mercurius.  
4. Add DataLoader for N+1 issues.  
5. Optimize Mongoose queries with `.lean()` and indexes.  
6. Add Redis caching.  
7. Profile and benchmark, then iterate.

---
