# HTTP REST API Routes Documentation

Table of Contents
- Global Overview
  - Server Base URL and Paths
  - Global Middleware Stack
  - Error Handling Convention
  - Versioning Strategy
  - Common Query Conventions
  - Status Codes Reference
  - OpenAPI/Swagger
  - Testing Notes
  - Changelog / Deprecated Routes
- Route Groups
  - Root
    - GET /
    - GET /sendnotification
  - Users
    - GET /users/

---

## Global Overview

### Server Base URL and Paths
- Base URL (local): http://localhost:4001
- REST base path: / (no version prefix)
- GraphQL endpoint (non‑REST): POST http://localhost:4001/graphql
- Static assets:
  - / (serves files from uploads/ and public/); see Static File Serving below.

Source: app.js

### Global Middleware Stack (execution order)
Applied to all incoming HTTP requests before hitting routers:
1. cors()
2. express.static(join(__dirname, './uploads'))
3. EJS view engine setup (views/, view engine 'ejs')
4. morgan logger('dev')
5. graphqlUploadExpress() (handles multipart for /graphql, still global)
6. express.json()
7. express.urlencoded({ extended: false })
8. cookieParser()
9. expressErrorHandler (error-handling middleware registration)
10. node-sass-middleware (serves/transpiles public/)
11. express.static(path.join(__dirname, 'public'))
12. AuthMiddleware (injects req.isAuth, req.user if JWT present)
13. QueryOptionsMiddleware (normalizes req.body.variables.options; primarily affects GraphQL)
14. Routers:
    - '/' -> routes/index.js
    - '/users' -> routes/users.js

Notes:
- Auth is non-blocking for REST routes: if Authorization header is missing/invalid, req.isAuth=false and request proceeds. No per-route auth checks are implemented in REST routes.
- QueryOptionsMiddleware expects req.body.variables and is relevant to GraphQL requests; it does not affect typical REST GET requests without bodies.

### Error Handling Convention
- GraphQL errors are transformed by helpers/handleErrors.js (formatError) with standardized shapes and codes (e.g., UNAUTHENTICATED -> 401, GRAPHQL_VALIDATION_FAILED -> 400). See helpers/handleErrors.js.
- Express errors (non-GraphQL) are handled by expressErrorHandler:
  - In development: JSON body { error: { message, stack } } with HTTP status set from err.status or 500.
  - In production: renders views/error.ejs with status code set.
- Sample error payloads can be found in errors_response.json (mostly GraphQL examples).

### Versioning Strategy
- No URL versioning (e.g., /v1) is implemented.

### Common Query Conventions
- None for REST. For GraphQL, QueryOptionsMiddleware injects:
  - variables.options = { paginationOptions: { page, limit }, sort, where, published }
  - where and sort are validated to be JSON strings; defaults are applied when missing.

### Status Codes Reference
- 200 OK: Successful REST responses in current routes.
- 4xx: Not explicitly returned by REST routes, but could occur via Express error handler or if middleware throws.
- 5xx: As above; server errors return 500 by default.

### OpenAPI/Swagger
- Not present. No Swagger/OpenAPI files or generators are configured.

### Testing Notes
- tests/ folder exists but contains no REST-specific tests for these routes. Most application functionality is exposed via GraphQL; REST routes are minimal.

### Changelog / Deprecated Routes
- None.

---

## Static File Serving (Global)
- GET /<file> where <file> exists under uploads/ is served by express.static(join(__dirname, './uploads')).
- GET /<path> where <path> exists under public/ is served by express.static(path.join(__dirname, 'public')).
- Content-Type: Determined by Express static middleware based on file extension.
- Caching headers: Default Express static behavior (no custom Cache-Control configured in code).

---

## Route Groups

# Root
Source file: routes/index.js

### GET /
- Purpose: Render the home page using EJS template views/index.ejs.
- Controller/Handler: inline in routes/index.js: (req, res) => res.render('index', { title: 'Express', port: process.env.port || 4000 })
- Middlewares (in order, global): cors, static uploads, view engine setup, morgan, graphqlUploadExpress, express.json, express.urlencoded, cookieParser, expressErrorHandler (registered), node-sass-middleware, static public, AuthMiddleware, QueryOptionsMiddleware, then index router.
- Path Params: none
- Query Params: none
- Headers: Accept (text/html); Authorization (optional, Bearer <JWT>, only sets req.isAuth)
- Request Body: none
- Responses:
  - 200 text/html: Renders the index page. Template variables: title (string), port (number, from env or 4000 used in template). Example body is HTML.
  - 5xx: If template rendering fails, Express error handler handles (JSON in development, error page in production).
- Auth Requirements: None (AuthMiddleware does not enforce access).
- Rate Limiting: None.
- Caching: Not configured.
- Side Effects: None.
- Idempotency: N/A.
- cURL example:
```
curl -i http://localhost:4001/
```
- Sample success (headers omitted): HTML content of home page.
- Known Edge Cases: If views/index.ejs is missing, a 500 may be returned in development; production renders error page.
- Deprecation: None.

### GET /sendnotification
- Purpose: Sends a Firebase push notification to a hard-coded registration token; responds immediately with plain text.
- Controller/Handler: inline in routes/index.js; uses utils/firebase-admin.js sendPushNotification(tokens, payload).
- Middlewares (in order): Same global stack as above.
- Path Params: none
- Query Params: none
- Headers: Authorization (optional Bearer <JWT>, not required)
- Request Body: none
- Responses:
  - 200 text/plain: "sending email"
  - 5xx: Unlikely from handler since it does not await/send errors; if an exception is thrown synchronously, Express error handler applies.
- Auth Requirements: None.
- Rate Limiting: None.
- Caching: None.
- Side Effects:
  - Triggers Firebase Admin SDK to send a push notification (asynchronous). Logs success/failure to server console.
- Idempotency: Not supported; repeated calls send multiple notifications.
- cURL example:
```
curl -i http://localhost:4001/sendnotification
```
- Sample success:
```
sending email
```
- Known Edge Cases:
  - The registration token array is hard-coded in code; no dynamic inputs.
  - If Firebase credentials are missing/invalid, server logs an error; response still says "sending email".
- Deprecation: None.

# Users
Source file: routes/users.js (mounted at /users)

### GET /users/
- Purpose: Simple placeholder endpoint returning a text response.
- Controller/Handler: inline in routes/users.js: (req, res) => res.send('respond with a resource')
- Middlewares (in order): Same global stack as above (since it's mounted after Auth/QueryOptions).
- Path Params: none
- Query Params: none
- Headers: Authorization (optional Bearer <JWT>, not required)
- Request Body: none
- Responses:
  - 200 text/plain: "respond with a resource"
  - 5xx: If an unexpected error occurs, Express error handler applies.
- Auth Requirements: None.
- Rate Limiting: None.
- Caching: None.
- Side Effects: None.
- Idempotency: N/A.
- cURL example:
```
curl -i http://localhost:4001/users/
```
- Sample success:
```
respond with a resource
```
- Known Edge Cases: None.
- Deprecation: None.

---

## Headers and Authentication Details
- Authorization: Optional. If present, must be in the form "Authorization: Bearer <JWT>". The JWT is verified with SECRET from config. On success, req.user is populated with the corresponding User document and req.isAuth=true. On failure/missing, req.isAuth=false. No REST route currently enforces authentication.

## Pagination / Filtering / Sorting
- Not applicable to current REST endpoints.

## Caching
- Not configured for REST endpoints.

## OpenAPI / Swagger
- Not available.

## Appendix: Source Files
- app.js
- routes/index.js
- routes/users.js
- middleware/auth.js
- middleware/queryOptions.js
- helpers/handleErrors.js
- utils/firebase-admin.js