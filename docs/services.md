# Services, Utilities, Background Jobs, and Scripts

This document catalogs the service layer utilities (utils/), helpers (helpers/), push/email notification services, and standalone scripts in this project. It explains purpose, configuration, public APIs (functions), expected inputs/outputs, side effects, and how to run any scripts. Where applicable, examples and environment variables are included.

Contents
- Overview
- Utilities (utils/)
  - connectDB.js
  - paginator.js
  - sendEmail.js (Gmail OAuth2 via Nodemailer)
  - emailConfirmationUrl.js (confirmation/invite links and email HTML)
  - forgetPasswordUrl.js (password reset link and email HTML)
  - firebase-admin.js (FCM push notifications)
- Helpers (helpers/)
  - handleNotification.js (createNotification, device tokens lookup)
  - userRelations.js (role derivation helpers and Options parsing)
  - modelsHelpers.js (modelArrayManager)
  - DateTimefunctions.js (timestamp formatter)
  - handleErrors.js (Express + GraphQL error utilities; referenced)
- Background Jobs
- Additional Scripts
  - migration.js (seed Categories tree)
  - seeds/category.js (category taxonomy)
  - sendemail.js (standalone Nodemailer sample)
- Related Credentials & Tokens

---

## Overview
Most of the app’s behavior is implemented through GraphQL resolvers backed by utilities and helpers. There is no persistent job runner (cron/agenda/bull) configured in this codebase; background-like work consists of:
- Sending push notifications via Firebase Admin SDK (asynchronously fire-and-forget inside requests).
- Sending transactional emails via Gmail OAuth2 + Nodemailer.
- Data seeding script for Categories (run-once CLI).

If you later add schedulers or queues, prefer a dedicated job worker and document it here (e.g., BullMQ with Redis, or node-cron with a PM2 process).

---

## Utilities (utils/)

### 1) utils/connectDB.js
- Purpose: Establish a Mongoose connection and configure connection events.
- Exports: default function connectDB()
- Behavior:
  - Sets mongoose debug mode, global Promise.
  - Connects using MONGO_URL from config (see Environment below).
  - Logs ‘🍃 Connected to MongoDB’ on open; logs errors on failures.
- Environment:
  - MONGO_URL: Mongo connection string.
- Usage (app.js):
  - connectDB() is invoked during server bootstrap before app.listen.

Code signature:
- connectDB(): void (side effect: opens Mongo connection)

---

### 2) utils/paginator.js
- Purpose: Compute a Pagination object and useful derived values (offset, total pages, record ranges) for server-side pagination.
- Exports: getPaginations(Model, page = 1, limit = 20, where = {}, sort = {})
- Inputs:
  - Model: String name of the Mongoose model (collection key) used with mongoose.model(Model).
  - page, limit: Pagination parameters.
  - where: Mongo/Mongoose filter object.
  - sort: Sort descriptor (object).
- Output: Pagination object
  - { currentPage, previousPage, nextPage, firstPage, lastPage, limit, offset, totalPages, totalRecords, fromRecord, toRecord }
- Notes:
  - Utilized by resolvers to combine with .paginate() helpers on models.

---

### 3) utils/sendEmail.js
- Purpose: Send transactional emails via Gmail using OAuth2.
- Exports: async function sendEmail(email, link, html)
- Inputs:
  - email: Recipient address (string)
  - link: Included in text body (string)
  - html: Full HTML body to send (string)
- Output: Result from Nodemailer transport.sendMail or thrown error.
- Implementation details:
  - Uses googleapis OAuth2 client with credentials from config.
  - Creates a Nodemailer transport with type: OAuth2 and sends via Gmail service.
- Environment (from config):
  - GMAIL_USER
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
  - GOOGLE_REDIRECT_URL
  - GOOGLE_REFRESH_TOKEN
- Example:
```
await sendEmail(user.email, verifyLink, await emailConfirmationBody(user.fullName, verifyLink));
```

---

### 4) utils/emailConfirmationUrl.js
- Purpose: Build verification and invite URLs for the frontend and provide email HTML templates.
- Exports:
  - async emailConfirmationUrl(user): Generates token, stores on User.emailConfirmToken, returns `${FRONTEND_URL}/user/confirm/<token>`
  - async emailShopInviteUrl(shopInvite): Returns `${FRONTEND_URL}/user/shopInvite/<token>`
  - async emailBrandInviteUrl(user): Returns `${FRONTEND_URL}/user/brandInvite/<token>`
  - async emailConfirmationBody(name, link): Returns HTML string for confirmation email
  - async emailInviteBody(invite, link): Returns HTML string for invite email
- Dependencies:
  - issueConfirmEmailToken, issueShopInviteToken from serializers/
  - FRONTEND_URL from config
  - User model for persisting confirmation token

---

### 5) utils/forgetPasswordUrl.js
- Purpose: Build password reset URL and HTML body.
- Exports:
  - async forgetPasswordUrl(user): Generates token, stores on User.resetPasswordToken, returns `${FRONTEND_URL}/user/reset-password/<token>`
  - async forgetPasswordBody(name, link): Returns HTML reset email body
- Dependencies:
  - issueConfirmEmailToken from serializers/
  - FRONTEND_URL from config
  - User model for persisting reset token

---

### 6) utils/firebase-admin.js
- Purpose: Initialize Firebase Admin SDK and send push notifications (FCM) to devices.
- Exports:
  - sendPushNotification(registrationTokens, payload): Fire-and-forget `admin.messaging().sendToDevice`.
- Initialization:
  - admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })
  - serviceAccount is loaded from local JSON (ioffer-366108-firebase-adminsdk-...json)
- Inputs:
  - registrationTokens: array of device tokens (strings)
  - payload: FCM payload object (e.g., { notification: { title, body }, data })
- Output: Logs success/failure; does not return promise to callers.
- Notes:
  - Consider switching to GOOGLE_APPLICATION_CREDENTIALS env var and loading credentials via env for production.

Example:
```
sendPushNotification(['token1','token2'], { notification: { title: 'Hello', body: 'World' } })
```

---

## Helpers (helpers/)

### 1) helpers/handleNotification.js
- Purpose: Persist Notification documents, create UserNotification entries for recipients, and optionally send push notifications.
- Exports:
  - async createNotification(data, receivers = [], isPushNotification = true):
    - data: Notification fields (title, messageTitle, messageBody, entityType, entity, link, sender will be added by resolver)
    - receivers: Array of Users (at least `id` and maybe `notificationToken` required)
    - isPushNotification: boolean, defaults true
    - Behavior: Creates Notification, bulk inserts UserNotification for receivers, extracts non-null notification tokens, and calls sendPushNotification(tokens, message) when enabled.
    - Returns: true on success, false on error.
  - async getAllUsersWithNotificationToken(): Users with hasNotificationToken=true, returning notificationToken.
  - async getAllModeratorsWithNotificationToken(Model, modelId): Loads owner/admins/modifiers/watchers for Shop/Brand and returns users with tokens.
- Side effects: Writes to notifications and user_notifications collections; sends FCM messages.

### 2) helpers/userRelations.js
- Purpose: Enrich models with a computed `user` field indicating the viewer's relationship/role; standardize Options inputs.
- Exports:
  - async getBrandUserRelation(userId, brands)
  - async getShopUserRelation(userId, shops)
  - async getPromotionUserRelation(userId, promotions)
  - getOptionsArguments(options): Parses Options input (strings for where/sort) into usable objects and returns { page, limit, sort, where, published }.
  - getPropValues(o, prop): Utility to collect nested property values across an object graph.
- Usage: Widely used in resolvers to determine OWNER/ADMIN/MODIFIER/WATCHER relation and to parse query options.

### 3) helpers/modelsHelpers.js
- Purpose: Synchronize many-to-many arrays between a parent model and related documents.
- Exports:
  - async modelArrayManager(Model, field, previousArray, newArray, id, slagField='title')
    - Computes newData/common/deleted across arrays and performs $push/$pull updates on related documents’ `field` with parent `id`.
    - Returns summary and update results.

### 4) helpers/DateTimefunctions.js
- Purpose: Produce a compact timestamp string (YYYY-M-D-HH-mm-ss) for storing displayable timestamps.
- Exports: function dateTime() returning a string.
- Usage: Used when creating entities to set publishingDateTime-like fields.

### 5) helpers/handleErrors.js
- Purpose: Two facets documented in docs/middleware.md and docs/graphql.md.
  - formatError(err): Apollo error mapper.
  - expressErrorHandler(err, req, res, next): Express error renderer.

---

## Background Jobs
- There is no dedicated job runner (e.g., cron, Agenda, Bull) configured in this repository.
- Time-based behaviors are handled inline, e.g.:
  - Invite documents expose a virtual `isExpired` (see brand/shop RoleBaseAccessInvite models) and status getters/setters map PENDING→EXPIRED when appropriate.
  - Push notifications and emails are sent asynchronously during request handling via helpers/handleNotification and utils/sendEmail.
- If you plan to introduce scheduled tasks (e.g., nightly cleanups, re-sending, aggregation):
  - Create a new process (jobs/worker.js) registered with PM2 or as a separate container.
  - Use node-cron or a queue (BullMQ + Redis) and document schedule, queue names, payload shapes here.

---

## Additional Scripts

### 1) migration.js
- Purpose: One-off seeding of a hierarchical Category tree from seeds/category.js.
- How it works:
  - Connects to a hard-coded MongoDB URI (note: contains credentials; consider moving to env).
  - Deletes existing categories and recursively traverses the seed object to create Category docs with level, parentCategory, and subCategories references.
- Run (example):
```
node migration.js
```
- Caution: This script deletes all documents in categories collection before seeding.

### 2) seeds/category.js
- Purpose: Source data for migration.js. Nested object structure representing categories and subcategories.
- Format: Nested key→object maps; leaves are {} for terminal categories.

### 3) sendemail.js
- Purpose: Standalone Nodemailer+Gmail OAuth2 sample for sending a test email.
- Status: Example only; contains placeholder variables (CLIENT_ID, CLEINT_SECRET, REFRESH_TOKEN, REDIRECT_URI) that must be defined in scope to work.
- Use project-wide utils/sendEmail.js for application emails instead.

---

## Related Credentials & Tokens
- Firebase Admin service account JSON: ioffer-366108-firebase-adminsdk-*.json (used by utils/firebase-admin.js)
- Google OAuth client credentials for Gmail (used by utils/sendEmail.js): set via config (see config/index.js in project) with:
  - GMAIL_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URL, GOOGLE_REFRESH_TOKEN
- tokens/credentials files present at repo root (credentials.json, token.json) may be related to Google OAuth flows; ensure they are secured and not required in production runtime.

---

## Quick Reference (Examples)

- Send confirmation email
```
const link = await emailConfirmationUrl({ id: user.id, email: user.email });
const html = await emailConfirmationBody(user.fullName, link);
await sendEmail(user.email, link, html);
```

- Send password reset email
```
const link = await forgetPasswordUrl({ id: user.id, email: user.email });
const html = await forgetPasswordBody(user.fullName, link);
await sendEmail(user.email, link, html);
```

- Create in-app notification and push
```
await createNotification({
  title: 'New Promotion',
  messageTitle: 'A promo is live!',
  messageBody: 'Check it out now',
  entityType: 'Promotion',
  entity: promotionId,
  link: '/promotions/' + promotionId,
  sender: user.id,
}, receiversArray, true);
```

- Use pagination in a resolver (pattern already applied)
```
const pagination = await getPaginations('brands', page, limit, where, sort);
const items = await Brand.find(where).paginate({ where, limit, sort, offset: pagination.offset });
return { brands: items, pagination };
```

If you introduce new services (e.g., SMS, payment gateways, job queues), add a new section under Utilities or Helpers and document:
- File path, exported API, required environment variables, example usage, and side effects.
