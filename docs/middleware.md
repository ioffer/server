# Middleware Documentation

Table of Contents
- Overview
- Global Middleware Stack (order of execution)
- Custom Middlewares
  - AuthMiddleware (middleware/auth.js)
  - QueryOptionsMiddleware (middleware/queryOptions.js)
  - File Upload Helpers (middleware/file.js)
  - expressErrorHandler (helpers/handleErrors.js)
- Third‑Party / Built‑in Middlewares
  - cors
  - morgan (logger)
  - graphqlUploadExpress (multipart handling)
  - express.json / express.urlencoded
  - cookieParser
  - node-sass-middleware
  - express.static (uploads, public)
- Interactions with GraphQL
- Usage Examples
- Known Caveats & Tips

---

## Overview
This document describes all Express middlewares used by the server, their execution order, purpose, configuration, inputs/outputs, and side effects. It covers both global middlewares registered in app.js and the custom middlewares under middleware/ and helpers/.

Source files:
- app.js
- middleware/auth.js
- middleware/queryOptions.js
- middleware/file.js
- helpers/handleErrors.js

---

## Global Middleware Stack (order of execution)
Registered in app.js, applied to every incoming request before routers:

1) cors()
- Purpose: Enable Cross‑Origin Resource Sharing.
- Config: Default (no custom options).
- Side effects: Sets CORS headers; allows cross‑origin requests.

2) express.static(join(__dirname, './uploads'))
- Purpose: Serve files from the uploads/ directory at the root URL path.
- Example: If uploads contains foo.png, it is available at GET /foo.png.

3) View engine setup (EJS)
- app.set('views', path.join(__dirname, 'views'))
- app.set('view engine', 'ejs')
- Purpose: Render HTML pages (used by GET /).

4) morgan('dev')
- Purpose: HTTP request logging in development‑friendly format.

5) graphqlUploadExpress()
- Purpose: Enable multipart/form-data for GraphQL file uploads on POST /graphql.
- Notes: No custom limits configured. Pairs with GraphQL Upload scalar and middleware/file.js helpers.

6) express.json()
- Purpose: Parse JSON request bodies into req.body.

7) express.urlencoded({ extended: false })
- Purpose: Parse URL-encoded bodies.

8) cookieParser()
- Purpose: Parse Cookie header into req.cookies.

9) expressErrorHandler (helpers/handleErrors.js)
- Purpose: Express error‑handling middleware to format errors depending on environment.
- Behavior:
  - Development: returns JSON { error: { message, stack } } with status err.status || 500.
  - Production: renders views/error.ejs with the status set.

10) node-sass-middleware
- Purpose: Compile Sass/SCSS from public/ to public/ on the fly.
- Config:
  - src: path.join(__dirname, 'public')
  - dest: path.join(__dirname, 'public')
  - indentedSyntax: true (treats .sass as default)
  - sourceMap: true

11) express.static(path.join(__dirname, 'public'))
- Purpose: Serve static assets from public/ (CSS, images, etc.).

12) AuthMiddleware (middleware/auth.js)
- Purpose: Decode and verify Authorization: Bearer <JWT>.
- Effects: Sets req.isAuth (boolean) and req.user (User doc) when a valid JWT is present; non‑blocking when absent/invalid.

13) QueryOptionsMiddleware (middleware/queryOptions.js)
- Purpose: Normalize req.body.variables.options for GraphQL operations (pagination/filter/sort published flag).
- Effects: Ensures variables/options exist; validates where/sort JSON strings; sets defaults.

14) Routers
- '/' -> routes/index.js
- '/users' -> routes/users.js

Order matters: earlier middlewares may affect or provide inputs to later ones (e.g., cookieParser before AuthMiddleware; express.json before QueryOptionsMiddleware).

---

## Custom Middlewares

### 1. AuthMiddleware
- File: middleware/auth.js
- Purpose: Authenticate requests by decoding JWT from the Authorization header.
- How it works:
  - Reads Authorization header; expects "Bearer <token>".
  - Verifies token with SECRET from config (config/index.js export via require('../config')).
  - Loads the user from MongoDB via models/User by decoded id.
  - Sets req.isAuth=true and req.user=<User> if valid; otherwise sets req.isAuth=false.
  - Always calls next(); never terminates the request on its own.
- Side effects:
  - Adds req.user and req.isAuth for later consumers (Apollo context uses these).
- Failure modes:
  - Missing header, malformed token, verification error, or missing user: req.isAuth=false.
- Example header:
  - Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6...

### 2. QueryOptionsMiddleware
- File: middleware/queryOptions.js
- Purpose: Provide a standard Options shape for GraphQL resolvers under req.body.variables.options.
- Input: req.body.variables (if present).
- Output: Sets req.body.variables.options to:
  - paginationOptions: { page: Int (default 1), limit: Int (default 20) }
  - where: Stringified JSON (default "{}", validated)
  - sort: Stringified JSON (default "{}", validated)
  - published: Boolean (default false)
- Behavior:
  - If variables or variables.options are missing, it creates them.
  - Validates where/sort are valid JSON strings; falls back to "{}" if parsing fails.
  - Logs to console for visibility and debugging.
- Scope: Mostly relevant to GraphQL POST /graphql; has no effect on typical REST GETs without bodies.

### 3. File Upload Helpers
- File: middleware/file.js
- Purpose: Handle writing uploaded files to disk for GraphQL uploads.
- Exports:
  - readFile(file):
    - Expects file to be a promise/object with createReadStream, filename, mimetype (from graphql-upload).
    - Writes the stream to uploads/ as single<random>-<timestamp><ext>.
    - Returns a relative URL string based on path after 'uploads' (e.g., /single1234-1699999999.png).
  - multipleReadFiles(files):
    - Iterates over an array of files, calling readFile for each; returns an array of relative URL strings.
- Notes:
  - The server globally serves uploads/ at '/', so returned relative URLs are resolvable directly, e.g., GET /single1234-...png.
  - Ensure uploads/ directory exists and is writable by the process.
  - No explicit file size/type validation is performed here.

### 4. expressErrorHandler
- File: helpers/handleErrors.js (export expressErrorHandler)
- Type: Express error‑handling middleware (signature: (err, req, res, next)).
- Behavior:
  - Sets res.locals.message and res.locals.error based on environment.
  - Development: returns JSON with message and stack trace.
  - Production: renders 'error' view.
- Note: GraphQL errors are formatted separately by formatError (same source file) at the Apollo layer.

---

## Third‑Party / Built‑in Middlewares

- cors (package: cors)
  - Registered with default settings.

- morgan('dev') (package: morgan)
  - HTTP request logger; prints concise colored output in development.

- graphqlUploadExpress (package: graphql-upload)
  - Enables multipart requests for GraphQL file uploads.
  - Used together with Upload scalar and middleware/file.js.

- express.json()
  - Parses JSON request bodies.

- express.urlencoded({ extended: false })
  - Parses URL‑encoded bodies (simple querystring library, not qs).

- cookieParser()
  - Parses Cookie header; no secret configured.

- node-sass-middleware
  - Compiles Sass/SCSS from public/ to public/ with source maps and indentedSyntax=true.

- express.static(join(__dirname, './uploads'))
  - Serves files stored under uploads/ at the site root.

- express.static(path.join(__dirname, 'public'))
  - Serves static assets (e.g., compiled CSS) from public/.

---

## Interactions with GraphQL
- Apollo Server context in app.js uses req.user and req.isAuth (set by AuthMiddleware).
- QueryOptionsMiddleware ensures req.body.variables.options is standardized; resolvers rely on this (pagination, filters, published flag).
- File uploads:
  - graphqlUploadExpress parses multipart/form-data and provides file objects with createReadStream in resolvers.
  - Resolvers call middleware/file.js readFile or multipleReadFiles to persist files and store returned URLs in Media documents.
- Error handling:
  - GraphQL errors are transformed by helpers/handleErrors.formatError; Express error handler is for non-GraphQL routes or middleware thrown errors outside Apollo.

---

## Usage Examples

1) Auth header example (affects AuthMiddleware and Apollo context)
- Request header:
  Authorization: Bearer <JWT>
- Effect:
  req.isAuth=true; req.user set to the user; GraphQL resolvers can enforce auth (@isAuth/@isAuth2 or manual checks).

2) GraphQL request body shape expected by QueryOptionsMiddleware
```
POST /graphql
Content-Type: application/json

{
  "query": "query($options: Options){ brands(options:$options){ pagination { totalRecords } brands { id name } } }",
  "variables": {
    "options": {
      "paginationOptions": { "page": 1, "limit": 10 },
      "where": "{}",
      "sort": "{}",
      "published": true
    }
  }
}
```
- If variables/options are omitted, the middleware injects defaults equivalent to the above.

3) GraphQL single file upload in playground (graphql-upload)
```
mutation ($file: Upload!, $mediaType: MediaTypes) {
  singleUpload(file: $file, mediaType: $mediaType) { id url mediaType }
}
```
- After upload, returned url values are relative (e.g., "/single1234-...png") and can be fetched at http://localhost:4001/single1234-...png

---

## Known Caveats & Tips
- AuthMiddleware is non‑blocking: REST routes do not enforce auth by default; they just gain req.isAuth=false when missing/invalid.
- QueryOptionsMiddleware expects where and sort to be JSON strings, not objects. It will coerce invalid values to "{}".
- File uploads:
  - The saved URL is relative to the site root based on the uploads split; ensure uploads/ exists and has correct permissions.
  - No file type/size filtering is implemented; add validation if needed.
- expressErrorHandler:
  - Only formats errors passed to next(err). GraphQL errors are handled by formatError.
- Static uploads mount at root ('/'): be careful with file name collisions or path assumptions in clients.

---

If you add new middleware, place custom ones under middleware/ (or helpers/ for error handlers), register them in app.js, and update this document with purpose, order, and configuration.