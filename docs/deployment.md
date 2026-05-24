# Deployment, CI/CD, and Scaling Guide

This document explains how to deploy, operate, and scale this Node.js (Express + Apollo Server GraphQL) service. It includes environment setup, Docker usage, reverse proxy/SSL, CI/CD examples, and operational guidance.

Contents
- Overview & Architecture
- Environment configuration (env vars & secrets)
- Running locally (development)
- Production runtime options
  - PM2 (systemd) on a VM
  - Docker container
  - Nginx reverse proxy + SSL
- CI/CD examples (GitHub Actions)
- Scaling strategies (PM2 cluster, Docker/K8s)
- Storage, static assets, and uploads
- Health checks, monitoring, logs, and backups
- Zero‑downtime deployments
- Troubleshooting checklist

---

## Overview & Architecture

- Runtime: Node.js 16.x
- Web framework: Express
- GraphQL: Apollo Server (apollo-server-express) with graphql-upload
- Data: MongoDB via Mongoose
- Auth: JWT via Authorization: Bearer <token> (decoded by middleware/auth.js)
- Static content: 
  - uploads/ served at site root (express.static(join(__dirname, './uploads')))
  - public/ served at / (express.static(path.join(__dirname, 'public')))
- Views: EJS (used by GET / only)
- Port: Default PORT is 4001 in code; Dockerfile sets ENV PORT 80 (override as needed)

---

## Environment configuration (env vars & secrets)

Set the following environment variables (names inferred from code and common practice):

- PORT: Port the Express app listens on. Defaults to process.env.PORT || process.env.port || 4001.
- SECRET: JWT signing secret (required by middleware/auth.js and graphql resolvers).
- MONGO_URI (or similar): Connection string used by utils/connectDB (configure accordingly).
- NODE_ENV: production or development (affects error rendering, logging).
- CORS_ORIGIN (optional): If you restrict CORS, configure CORS middleware accordingly.
- LOGROCKET_APP_ID (optional): LogRocket.init('2oiqcd/ioffer') is hardcoded; you can gate by env.
- GOOGLE/Firebase credentials: utils/firebase-admin.js requires a JSON service account file. Options:
  - Keep the file in the image (current code requires ../ioffer-...json). OR
  - Mount a secret at runtime and change the require path or set GOOGLE_APPLICATION_CREDENTIALS and initialize from env (requires small code change). If keeping current approach, ensure the file exists in container.

Tip: Use dotenv only in development, inject envs in production via systemd, Docker, or CI/CD.

---

## Running locally (development)

Prerequisites:
- Node.js 16+
- Yarn (or npm)
- MongoDB reachable from your machine

Steps:
1) Install dependencies
   - yarn install
2) Set env
   - export SECRET=your_jwt_secret
   - export MONGO_URI=mongodb://localhost:27017/ioffer
   - export PORT=4001
3) Start dev server (auto-restart + Babel via nodemon)
   - yarn start
   - Script: nodemon --exec babel-node app.js

GraphQL endpoint: POST http://localhost:4001/graphql
Root page (EJS): GET http://localhost:4001/

---

## Production runtime options

You can run the service directly with Node/PM2 on a VM, or containerize with Docker and place it behind Nginx. Both options are described below.

### Option A: PM2 on a VM

- Install Node 16 and PM2 on the server.
- Create a PM2 ecosystem file (ecosystem.config.js) similar to:

```
module.exports = {
  apps: [
    {
      name: 'ioffer-server',
      script: 'app.js',
      instances: 'max', // or a number, use 1 if CPU-bound by Mongo client
      exec_mode: 'cluster',
      node_args: '-r @babel/register', // to transpile imports at runtime
      env: {
        NODE_ENV: 'production',
        PORT: 4001,
        SECRET: 'change-me',
        MONGO_URI: 'mongodb://mongo:27017/ioffer'
      }
    }
  ]
}
```

Commands:
- pm2 start ecosystem.config.js
- pm2 status
- pm2 logs ioffer-server
- pm2 reload ioffer-server  # zero‑downtime reload
- pm2 startup && pm2 save    # start on reboot

Note: The repo uses Babel imports. In production you can either:
- Use node -r @babel/register app.js; or
- Pre-compile with @babel/cli and run node dist/app.js. If you choose to build, add a build script and copy dist.

### Option B: Docker

Dockerfile (in repo) summary:
- Base: node:16.16.0
- WORKDIR /code
- ENV PORT 80
- Installs deps with yarn, copies code, installs again, CMD yarn start
- Exposes 80

Build & run:

```
# Build image
docker build -t your-registry/ioffer-server:latest .

# Run container (example)
docker run -d \
  --name ioffer-server \
  -e NODE_ENV=production \
  -e PORT=4001 \
  -e SECRET=change-me \
  -e MONGO_URI=mongodb://host.docker.internal:27017/ioffer \
  -p 4001:4001 \
  -v $(pwd)/uploads:/code/uploads \
  your-registry/ioffer-server:latest
```

Notes:
- The current Dockerfile starts yarn start (nodemon + babel-node), which is fine for development but not ideal for production. In production, prefer a CMD like:
  - CMD ["node", "-r", "@babel/register", "app.js"]
  - Or use pm2-runtime: CMD ["pm2-runtime", "start", "ecosystem.config.js"] (requires adding pm2 and config)
- Mount uploads/ as a volume to persist user-uploaded files across deployments.
- Expose the port you actually run on; change ENV PORT or map container port accordingly.

### Reverse Proxy & SSL (Nginx)

Place Nginx in front of the Node container/VM to terminate TLS, enable gzip, and handle buffering for uploads.

Example Nginx site config:

```
server {
  listen 80;
  server_name api.example.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.example.com;

  ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

  client_max_body_size 20m; # for graphql-upload
  gzip on;
  gzip_types application/json application/graphql application/javascript text/plain text/css;

  location / {
    proxy_pass http://ioffer_upstream;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

upstream ioffer_upstream {
  server 127.0.0.1:4001; # adjust to container IP:port if using Docker without host network
}
```

Use certbot for Let’s Encrypt or your TLS provider. For Docker Compose, include an nginx service and link to the Node container.

---

## CI/CD examples (GitHub Actions)

Below is a minimal workflow that:
- Installs dependencies, runs tests, builds a Docker image, pushes to a registry, and deploys via SSH.

Create .github/workflows/deploy.yml in your repo (adjust registry/host):

```
name: CI/CD

on:
  push:
    branches: [ main ]

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '16' }
      - run: yarn install --frozen-lockfile
      - run: yarn test --ci --reporters=default || true # keep pipeline going if tests absent
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ghcr.io/<owner>/ioffer-server:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: SSH Deploy
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            docker pull ghcr.io/<owner>/ioffer-server:latest
            docker rm -f ioffer-server || true
            docker run -d --name ioffer-server \
              -e NODE_ENV=production \
              -e SECRET='${{ secrets.JWT_SECRET }}' \
              -e MONGO_URI='${{ secrets.MONGO_URI }}' \
              -e PORT=4001 \
              -p 4001:4001 \
              -v /srv/ioffer/uploads:/code/uploads \
              ghcr.io/<owner>/ioffer-server:latest
```

Notes:
- Secrets required: SSH_HOST, SSH_USER, SSH_KEY, JWT_SECRET, MONGO_URI (and optionally Firebase secrets).
- For Kubernetes, replace the SSH step with kubectl apply using a K8s manifest and image tag from the build.

---

## Scaling strategies

### PM2 cluster mode (single VM)
- Use PM2 cluster mode with instances equal to CPU cores: instances: 'max'.
- Suitable for vertical scaling on a single machine.
- Zero‑downtime reloads with pm2 reload.

Caveats:
- Sessions: The app is stateless (JWT-based); no sticky sessions are required. GraphQL uploads are HTTP multipart; Nginx buffers the request before proxying, so no shared state across workers is needed.
- Ensure your MongoDB can handle concurrent connections.

### Docker Swarm or Compose replicas
- Run multiple replicas behind Nginx or a reverse proxy (e.g., Traefik). Example with docker-compose:

```
version: '3.9'
services:
  api:
    image: your-registry/ioffer-server:latest
    environment:
      NODE_ENV: production
      SECRET: ${SECRET}
      MONGO_URI: ${MONGO_URI}
      PORT: 4001
    ports:
      - '4001:4001'
    volumes:
      - ./uploads:/code/uploads
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: '0.50'
          memory: 512M
```

### Kubernetes (recommended for larger scale)
- Create a Deployment, Service, and Ingress with TLS.
- Enable HorizontalPodAutoscaler (HPA) on CPU or custom metrics.
- Mount a PersistentVolume for uploads/ (ReadWriteMany if multiple replicas need write access; otherwise consider offloading uploads to S3/GCS and serve via CDN).

Example K8s snippets (pseudo):

```
apiVersion: apps/v1
kind: Deployment
metadata: { name: ioffer-api }
spec:
  replicas: 3
  selector: { matchLabels: { app: ioffer-api } }
  template:
    metadata: { labels: { app: ioffer-api } }
    spec:
      containers:
        - name: api
          image: your-registry/ioffer-server:latest
          ports: [{ containerPort: 4001 }]
          env:
            - name: NODE_ENV
              value: production
            - name: SECRET
              valueFrom: { secretKeyRef: { name: ioffer-secrets, key: jwt-secret } }
            - name: MONGO_URI
              valueFrom: { secretKeyRef: { name: ioffer-secrets, key: mongo-uri } }
          volumeMounts:
            - name: uploads
              mountPath: /code/uploads
      volumes:
        - name: uploads
          persistentVolumeClaim: { claimName: uploads-pvc }
```

---

## Storage, static assets, and uploads

- uploads/: Stores user-uploaded files (used by graphql-upload helpers). Persist this directory between deploys.
  - VM/PM2: Keep uploads/ on disk and avoid deleting between releases; or symlink to a persistent path.
  - Docker: Bind mount a host directory or use a named volume.
  - Kubernetes: Use a PVC or offload to an object store (recommended at scale).
- public/: Compiled assets from node-sass-middleware. Served statically; typically baked into the image.

File size limits:
- Set Nginx client_max_body_size to support your maximum upload size (e.g., 20m).
- Optionally configure graphqlUploadExpress({ maxFileSize, maxFiles }) if needed.

---

## Health checks, monitoring, logs, and backups

Health checks:
- HTTP: Use GET / as a basic liveness check (renders EJS). For API liveness, consider adding GET /health returning 200 and a JSON status.
- GraphQL: Optionally add a lightweight query like { version } for readiness.

Monitoring & APM:
- LogRocket is initialized (client-side focus). For server metrics, consider Prometheus exporters, OpenTelemetry, or hosted APM (Datadog, New Relic).
- Enable morgan logs in production or switch to JSON logging with pino for structured logs.

Logs:
- PM2: pm2 logs ioffer-server; configure log rotation.
- Docker: docker logs ioffer-server (or forward to ELK/Loki/CloudWatch).

Backups:
- Database: Back up MongoDB using mongodump/mongorestore or managed backups if using Atlas.
- File uploads: If using local/PVC storage, snapshot or sync to object storage.

---

## Zero‑downtime deployments

- PM2: Use pm2 reload ioffer-server to reload processes without downtime.
- Docker: Run new container, update the reverse proxy to point to the new container, then stop old (blue/green) or use rolling updates with Swarm/K8s.
- Kubernetes: Rolling updates by default; tune maxUnavailable and maxSurge for safer rollouts.

DB migrations/seed:
- The repo contains migration.js and seeds/. If you rely on them, run as a preDeploy step or a Job in K8s.

---

## Troubleshooting checklist

- App won’t start:
  - Verify SECRET, MONGO_URI, and PORT are set correctly.
  - Check that MongoDB is reachable from the runtime environment and credentials are valid.
  - If using Docker, confirm container has network access to MongoDB.
- Uploads fail:
  - Check Nginx client_max_body_size and graphql-upload settings.
  - Ensure uploads/ is writable by the process and persisted (volume mounted).
- Auth always false:
  - Ensure Authorization: Bearer <JWT> header is present and SECRET matches what was used to sign the token.
- 500 errors on EJS root route:
  - Confirm views/ exists in the container or deployment and the template renders.
- Firebase notification errors:
  - Ensure the service account file is present at the expected path or refactor to use GOOGLE_APPLICATION_CREDENTIALS env.

---

## Appendix: Commands quick reference

- Development:
  - yarn install
  - export SECRET=... MONGO_URI=... PORT=4001
  - yarn start

- Docker:
  - docker build -t your-registry/ioffer-server:latest .
  - docker run -d -p 4001:4001 -e NODE_ENV=production -e SECRET=... -e MONGO_URI=... -e PORT=4001 -v $(pwd)/uploads:/code/uploads your-registry/ioffer-server:latest

- PM2:
  - pm2 start ecosystem.config.js
  - pm2 reload ioffer-server
  - pm2 logs ioffer-server
