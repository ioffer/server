# GraphQL API Documentation

Table of Contents
- Overview (Runtime, Server, Middleware, Context)
- Schema Overview
  - Custom Scalars
  - Enums
  - Unions
  - Directives
  - Object Types (fields and relationships)
  - Input Types
- Root Operations
  - Queries
  - Mutations
  - Subscriptions
- Resolvers: Files and Behaviors
- Options, Pagination, Filtering, Sorting
- Security and Auth
- Error Handling
- Performance (N+1, Caching, Limits)
- SDL Dump (Full Schema)
- Examples (Queries/Mutations/Uploads)
- REST ↔ GraphQL Notes

---

## Overview

Runtime/Server
- GraphQL Server: Apollo Server (apollo-server-express) v3.7.0
- GraphQL Spec: graphql 15.10.1
- Schema Assembly: @graphql-tools/schema + @graphql-tools/merge
- Uploads: graphql-upload (graphqlUploadExpress middleware) + scalar Upload (GraphQLUpload in resolvers)
- Plugins: ApolloServerPluginInlineTrace, ApolloServerPluginLandingPageGraphQLPlayground
- Introspection: enabled (introspection: true)
- Playground: enabled with dark theme and custom settings

Server Integration (app.js)
- Express with CORS, morgan, cookie-parser, node-sass-middleware, and static serving of uploads/ and public/
- Custom middleware:
  - AuthMiddleware: Decodes Authorization: Bearer <JWT> into req.user, sets req.isAuth
  - QueryOptionsMiddleware: Ensures req.body.variables.options exists and is well-formed (pagination/filter/sort)
- Apollo Context: context({ req }): { req, user: req.user, isAuth: req.isAuth, ...AppModels }
- Error formatting: helpers/handleErrors.formatError standardizes GraphQL errors

---

## Schema Overview

Custom Scalars
- Upload: Provided for file uploads (singleUpload, multipleUpload)

Enums (schema/constants/enums.js)
- Status: PENDING, NOT_SUBMITTED, VERIFIED, REJECTED, ARCHIVED, DELETED, UPCOMING, PUBLISHED, DRAFT, ACCEPTED, EXPIRED
- Role: SUPER_ADMIN, ADMIN, MODIFIER, WATCHER, OWNER, USER
- Verified: REJECTED, PENDING, VERIFIED
- Sort: NEWEST, LOW_TO_HIGH, HIGH_TO_LOW, TOP_SOLD
- MediaTypes: AVATAR, IMAGE, BOOKLET, THUMBNAIL, LOGO, VIDEO, VIDEO_THUMBNAIL
- Model (for Notification.entityType): User, Promotion, Brand, Shop, BrandRoleBaseAccessInvite, ShopRoleBaseAccessInvite

Union
- Entity = User | Promotion | Brand | Shop | BrandRoleBaseAccessInvite | ShopRoleBaseAccessInvite

Directives
- @isAuth(requires: Role = ADMIN): Declared in baseDefs; not transformed in code. Resolver-level auth checks are still enforced where used.
- @isAuth2(requires: [Role] = [USER]): Enforced by schema/directives/isAuth2.directive.js
  - Injects runtime authorization logic. If context.isAuth is false → Error("Need Authorization").
  - Computes base role for entity access (Brand/Shop/Promotion) and verifies user has one of the required roles.

Object Types (selection of notable fields; complete SDL below)
- User (schema/user/type.js; resolvers in schema/user/resolver.js)
  - Relations: shops, brands, favorites, pins, subscriptions, roleBasedAccess
- Shop (schema/shop/type.js; resolvers in schema/shop/resolver.js)
  - Relations: brand, category, subCategory, logo, coverImage, tags, owner, admins, modifiers, watchers, subscribers, roleBaseAccessInvites, verifiedBy, promotions
- Brand (schema/brand/type.js; resolvers in schema/brand/resolver.js)
  - Relations: logo, coverImage, promotions, category, subCategory, tags, brandShops, admins, modifiers, watchers, subscribers, roleBaseAccessInvites, owner, verifiedBy
- Promotion (schema/promotion/type.js; resolvers in schema/promotion/resolver.js)
  - Relations: shops, publisher, verifiedBy, brand, category, subCategory, tags, media
- Media (schema/media/type.js)
- Category (schema/category/type.js; resolvers in schema/category/resolver.js)
  - Relations: parentCategory, subCategories
- Tag (schema/tag/type.js; resolvers in schema/tag/resolver.js)
  - Relations: shops, brands
- Notification (schema/notification/type.js; resolvers in schema/notification/resolver.js)
  - entityData resolves dynamically by entityType (union Entity), sender resolved to User
- UserNotification (schema/notification/type.js; resolvers in schema/notification/resolver.js)
- RoleBasedAccess (schema/roleBasedAccess/type.js)
- Pin (schema/pin/type.js)
- Favorite (schema/favorite/type.js)
- ShopRoleBaseAccessInvite (schema/shopRoleBaseAccessInvite/type.js; resolvers in schema/shopRoleBaseAccessInvite/resolver.js)
- BrandRoleBaseAccessInvite (schema/brandRoleBaseAccessInvite/type.js; resolvers in schema/brandRoleBaseAccessInvite/resolver.js)

Input Types
- UserRegisterInput, UserInput
- ShopInput
- PromotionInput
- BrandInput
- PaginationOptions(page, limit), Options(paginationOptions, where, sort, published)

---

## Root Operations

Queries
- Users (schema/user/query.js → schema/user/resolver.js)
  - authUser: User @isAuth
  - loginUser(userName: String!, password: String!): AuthUser!
  - verify2FA(token: String!): Boolean! @isAuth
  - users: [User]
  - me: User! @isAuth
  - userById(id: ID!): User
  - searchPendingKyc: [User] @isAuth
  - searchUnBlockedUsers: [User] @isAuth
  - version: String!
- Shops (schema/shop/query.js → schema/shop/resolver.js)
  - allShops(options: Options): Shops @isAuth2(requires: [SUPER_ADMIN])
  - shops(options: Options): Shops @isAuth
  - publishedShops(options: Options): Shops
  - shopById(id: ID!): Shop @isAuth
  - moderatorsByShopId(id: ID!): [ShopRoleBaseAccessInvite] @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN, MODIFIER, WATCHER])
  - searchPendingShops(options: Options): Shops @isAuth2(requires: [SUPER_ADMIN])
  - searchBlockedShops(options: Options): Shops @isAuth2(requires: [SUPER_ADMIN])
- Promotions (schema/promotion/query.js → schema/promotion/resolver.js)
  - promotions(options: Options): Promotions
  - publishedPromotions(options: Options): Promotions
  - promotionById(id: ID!): Promotion
  - searchPendingPromotions(options: Options): Promotions @isAuth2(requires: [SUPER_ADMIN])
  - searchArchivedPromotions(shopId: ID!, options: Options): Promotions @isAuth2(requires: [SUPER_ADMIN, OWNER])
  - searchUpcomingPromotions(shopId: ID!, options: Options): Promotions @isAuth2(requires: [SUPER_ADMIN])
- Brands (schema/brand/query.js → schema/brand/resolver.js)
  - allBrands(options: Options): Brands @isAuth2(requires: [SUPER_ADMIN])
  - brands(options: Options): Brands @isAuth
  - publishedBrands(options: Options): Brands
  - brandById(id: ID!): Brand @isAuth
  - moderatorsByBrandId(id: ID!): [BrandRoleBaseAccessInvite] @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN, MODIFIER, WATCHER])
  - searchPendingBrands(options: Options): Brands @isAuth2(requires: [SUPER_ADMIN])
  - searchBlockedBrands(options: Options): Brands @isAuth2(requires: [SUPER_ADMIN])
- Categories (schema/category/query.js → schema/category/resolver.js)
  - categories: [Category]
  - categoryById(id: ID!): Category
  - mainCategories: [Category]
  - subCategories(id: ID!): [Category]
- Tags (schema/tag/query.js → schema/tag/resolver.js)
  - tags: [Tag]
  - tagById(id: ID!): Tag
  - tagByTitle(title: String!): Tag
- Media (schema/media/query.js → schema/media/resolver.js)
  - greeting: String!
- Notifications (schema/notification/query.js → schema/notification/resolver.js)
  - userNotificationById(id: ID!): UserNotification @isAuth
  - listUserNotifications(options: Options): UserNotifications @isAuth

Mutations
- Users (schema/user/query.js → schema/user/resolver.js)
  - verifyKyc(id: ID!): Boolean @isAuth
  - cancelKyc(id: ID!): Boolean @isAuth
  - updateNotificationToken(token: String): Boolean @isAuth
  - registerUser(newUser: UserRegisterInput!): AuthUser!
  - editUser(newUser: UserInput!): User @isAuth
  - confirmEmail(token: String!): Boolean!
  - forgetPassword(email: String!): Boolean!
  - resetPassword(token: String!, password: String!): Boolean!
  - changePassword(password: String!, newPassword: String!): Boolean!
  - enable2FA: User @isAuth
  - disable2FA: Boolean! @isAuth
  - blockUser(id: ID!): Boolean!
  - deleteUser(id: String!): User
  - addKyc(...): User @isAuth
  - editKyc(...): User @isAuth
  - createAdmin(email: String!): Boolean! @isAuth
- Shops (schema/shop/query.js → schema/shop/resolver.js)
  - registerShop(newShop: ShopInput!): Shop @isAuth
  - editShop(id: ID!, newShop: ShopInput!): Shop @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - deleteShop(id: ID!): Boolean @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN])
  - verifyShop(id: ID!): Boolean @isAuth2(requires: [SUPER_ADMIN])
  - blockShop(id: ID!): Boolean @isAuth2(requires: [SUPER_ADMIN])
  - unblockShop(id: ID!): Boolean @isAuth2(requires: [SUPER_ADMIN])
  - archiveShop(id: ID!): Boolean @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - unArchiveShop(id: ID!): Boolean @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - inviteShopModerator(id: ID!, email: String!, role: String!): Boolean @isAuth2(requires: [ADMIN, OWNER])
  - removeShopModerator(id: ID!, email: String!, role: String!): Boolean @isAuth2(requires: [ADMIN, OWNER])
  - acceptShopInvite(token: String!): Boolean @isAuth
  - clickShop(id: ID!): Boolean
  - viewShop(id: ID!): Boolean
  - toggleSubscribeShop(id: ID!): Boolean @isAuth
- Promotions (schema/promotion/query.js → schema/promotion/resolver.js)
  - createPromotion(newPromotion: PromotionInput!): Promotion @isAuth
  - editPromotion(id: ID!, newPromotion: PromotionInput!): Promotion @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - deletePromotion(id: ID!): Boolean @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN])
  - verifyPromotion(id: ID!): Boolean @isAuth2(requires: [SUPER_ADMIN])
  - archivePromotion(id: ID!): Boolean @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - unArchivePromotion(id: ID!): Boolean @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - clickPromotion(id: ID!): Boolean
  - viewPromotion(id: ID!): Boolean
- Brands (schema/brand/query.js → schema/brand/resolver.js)
  - createBrand(newBrand: BrandInput!): Brand @isAuth
  - editBrand(id: ID!, newBrand: BrandInput!): Brand @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - deleteBrand(id: ID!): Boolean @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN])
  - archiveBrand(id: ID!): Boolean @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - unArchiveBrand(id: ID!): Boolean @isAuth2(requires: [MODIFIER, ADMIN, OWNER])
  - verifyBrand(id: ID!): Boolean @isAuth2(requires: [SUPER_ADMIN])
  - blockBrand(id: ID!): Boolean @isAuth2(requires: [SUPER_ADMIN])
  - unblockBrand(id: ID!): Boolean @isAuth2(requires: [SUPER_ADMIN])
  - inviteBrandModerator(id: ID!, email: String!, role: String!): Boolean @isAuth2(requires: [ADMIN, OWNER])
  - removeBrandModerator(id: ID!, email: String!, role: String!): Boolean @isAuth2(requires: [ADMIN, OWNER])
  - acceptBrandInvite(token: String!): Boolean @isAuth
  - clickBrand(id: ID!): Boolean
  - viewBrand(id: ID!): Boolean
  - toggleSubscribeBrand(id: ID!): Boolean @isAuth
- Media (schema/media/query.js → schema/media/resolver.js)
  - singleUpload(file: Upload!, mediaType: MediaTypes): Media
  - multipleUpload(files: [Upload]!, mediaType: MediaTypes): Media
- Notifications (schema/notification/query.js → schema/notification/resolver.js)
  - createNotification(newNotification: NotificationInput!): Boolean @isAuth
  - viewNotification(id: ID!): Boolean @isAuth
  - deleteNotification(id: ID!): Boolean @isAuth

Subscriptions
- Declared placeholder type Subscription with _ field only; no active subscription operations are implemented.

---

## Resolvers: Files and Behaviors

- schema/user/resolver.js
  - Implements User type field resolvers: shops, brands, favorites, pins, subscriptions, roleBasedAccess.
  - Queries: users, version, me (requires isAuth), userById, loginUser (validations via yup rules in validations/, password via bcryptjs). Issues JWT, 2FA support via speakeasy/qrcode. Many mutations for auth, KYC, email flows (sendEmail helpers).
  - Auth: Checks isAuth for protected fields; throws AuthenticationError when missing.
  - Data Access: Mongoose models User, Shop, Brand, Favorite, Pin, RoleBaseAccess, Subscription.

- schema/shop/resolver.js
  - Shop object field resolvers for relations (brand, tags, categories, users roles, media, promotions, subscribers, invites).
  - Queries with Options pagination and user-role scoping (merging owned and role-based access shops). Uses getPaginations and query helpers (paginate()).
  - Mutations manage lifecycle (register/edit/delete/verify/block/archive/unarchive), moderators invitations, clicks/views, subscribe toggles, notifications side-effects via helpers/handleNotification.
  - Auth: Mix of @isAuth/@isAuth2 and manual checks; role derivation for access in directive.

- schema/brand/resolver.js
  - Similar to Shop: resolves media, categories, tags, brandShops, moderators, subscribers, owner, verifiedBy; Promotions filtered by published flag from variables.options.
  - Queries/Mutations mirror Shops for brands.

- schema/promotion/resolver.js
  - Resolves relations to shops, users, brand, categories, tags, media.
  - Queries respect Options (pagination, published) and user access by aggregating promotions across owned/role-based brands/shops.
  - Mutations include create/edit/delete/verify/archive/unarchive, click/view. Notifications to users via helpers/handleNotification.

- schema/media/resolver.js
  - Upload logic with readFile/multipleReadFiles middlewares; returns Media documents. Uses GraphQLUpload scalar.

- schema/category/resolver.js
  - Resolves parentCategory, subCategories; provides mainCategories and nested subcategory traversal (deep populate).

- schema/tag/resolver.js
  - Resolves shops/brands; createTag requires auth and idempotently returns existing tag if found.

- schema/notification/resolver.js
  - Notification.entityData dynamically resolves by entityType to correct model; UserNotification pagination with notDeleted query helper; mark seen/delete mutations.

- schema/shopRoleBaseAccessInvite/resolver.js & schema/brandRoleBaseAccessInvite/resolver.js
  - Resolve user/invited and shop/brand relations for invite records.

- schema/roleBasedAccess/resolver.js
  - Contains legacy-like Shop query/mutation stubs; effective operational queries for shops are in schema/shop/resolver.js.

N+1, Projection, and Transactions
- Many resolvers call Mongoose findById/find with $in. Some use populate. No DataLoader is implemented; potential N+1 exists on relation-heavy fields.
- No explicit transactions used; updates via findOneAndUpdate/save.
- Projection: Some resolvers limit selections via select() during complex aggregation.

Caching
- No per-resolver caching layer found. Apollo inline tracing plugin enabled; no response caching configured.

---

## Options, Pagination, Filtering, Sorting

- Input Options: { paginationOptions: { page, limit }, where, sort, published }
- QueryOptionsMiddleware ensures options are present even if client omits them and validates JSON strings for where/sort.
- Pagination helper getPaginations computes offset/limits and returns a Pagination object.
- Many Mongoose models expose query helpers: paginate(options), published(), notDeleted(), etc.

---

## Security and Auth

- JWT parsed from Authorization header; decoded with SECRET from config. Sets req.isAuth and req.user.
- @isAuth2 directive enforces role-based access on annotated fields using runtime checks against Brand/Shop/Promotion relations.
- @isAuth is declared in SDL; enforcement is primarily via resolver-level isAuth checks (AuthenticationError) in code.
- Introspection enabled, CORS enabled. File uploads allowed (no explicit size limits in code).

---

## Error Handling

- formatError in helpers/handleErrors.js maps common cases:
  - UNAUTHENTICATED → { message: 'Authentication Must Be Provided', code: 401 }
  - GRAPHQL_VALIDATION_FAILED → { message, code: 400 }
  - ValidationError (custom) → single or multiple error messages, code 500
  - ApolloError passthrough; otherwise Internal Server Error with UUID

---

## Performance (N+1, Caching, Limits)

- N+1: Potential on fields resolving arrays of relations (e.g., Shop.admins). Consider batching with DataLoader if needed.
- Caching: Not configured.
- Limits: No depth/complexity limits, timeouts, or persisted queries configured.

---

## SDL Dump (Full Schema)

```graphql
schema {
    query: Query
    mutation: Mutation
    subscription: Subscription
}
"The `Upload` scalar type represents a file upload."
scalar Upload
type Query {
    _: String
    authUser: User
    loginUser(userName: String!, password: String!): AuthUser!
    verify2FA(token: String!): Boolean!
    users: [User]
    me: User!
    userById(id: ID!): User
    searchPendingKyc: [User]
    searchUnBlockedUsers: [User]
    version: String!
    shops: [Shop]
    shopById(id: ID!): Shop
    searchPendingShops: [Shop]
    searchBlockedShops: [Shop]
    promotions: [Promotion]
    promotionById(id: ID!): Promotion
    searchPendingPromotions: [Promotion]
    searchArchivedPromotions(shopId: ID!): [Promotion]
    searchUpcomingPromotions(shopId: ID!): [Promotion]
    greeting: String!
    brands(offset: Int, limit: Int): [Brand]
    publishedBrands(offset: Int, limit: Int): [Brand]
    brandById(id: ID!): Brand
    searchPendingBrands: [Brand]
    searchBlockedBrands: [Brand]
    categories: [Category]
    categoryById(id: ID!): Category
    mainCategories: [Category]
    subCategories(id: ID!): [Category]
    tags: [Tag]
    tagById(id: ID!): Tag
    tagByTitle(title: String!): Tag
}
type Mutation {
    _: String
    verifyKyc(id: ID!): Boolean
    cancelKyc(id: ID!): Boolean
    registerUser(newUser: UserRegisterInput!): AuthUser!
    editUser(newUser: UserInput!): User
    confirmEmail(token: String!): Boolean!
    forgetPassword(email: String!): Boolean!
    resetPassword(token: String!, password: String!): Boolean!
    changePassword(password: String!, newPassword: String!): Boolean!
    enable2FA: User
    disable2FA: Boolean!
    blockUser(id: ID!): Boolean!
    deleteUser(id: String!): User
    addKyc(id: String!, mobile: String, birthDate: String, nationality: String, country: String, postalCode: String, city: String, street: String, building: String, kycStatus: Status): User
    editKyc(id: String!, mobile: String, birthDate: String, nationality: String, country: String, postalCode: String, city: String, street: String, building: String, kycStatus: Status): User
    createAdmin(email: String!): Boolean!
    registerShop(newShop: ShopInput!): Shop
    editShop(id: ID!, newShop: ShopInput!): Shop
    deleteShop(id: ID!): Boolean
    verifyShop(id: ID!): Boolean
    blockShop(id: ID!): Boolean
    archiveShop(id: ID!): Boolean
    unArchiveShop(id: ID!): Boolean
    inviteShopModerator(id: ID!, email: String!, role: String!): Boolean
    removeShopModerator(id: ID!, email: String!, role: String!): Boolean
    clickShop(id: ID!): Boolean
    viewShop(id: ID!): Boolean
    subscribeShop(id: ID!): Boolean
    createPromotion(newPromotion: PromotionInput!): Promotion
    editPromotion(id: ID!, newPromotion: PromotionInput!): Promotion
    deletePromotion(id: ID!): Boolean
    verifyPromotion(id: ID!): Boolean
    archivePromotion(id: ID!): Boolean
    clickPromotion(id: ID!): Boolean
    viewPromotion(id: ID!): Boolean
    singleUpload(file: Upload!, mediaType: MediaTypes): Media
    multipleUpload(files: [Upload]!, mediaType: MediaTypes): Media
    createBrand(newBrand: BrandInput!): Brand
    editBrand(id: ID!, newBrand: BrandInput!): Brand
    deleteBrand(id: ID!): Boolean
    archiveBrand(id: ID!): Boolean
    unArchiveBrand(id: ID!): Boolean
    verifyBrand(id: ID!): Boolean
    blockBrand(id: ID!): Boolean
    inviteBrandModerator(id: ID!, email: String!, role: String!): Boolean
    removeBrandModerator(id: ID!, email: String!, role: String!): Boolean
    clickBrand(id: ID!): Boolean
    viewBrand(id: ID!): Boolean
    subscribeBrand(id: ID!): Boolean
    createTag(title: String!): Tag
}
type Subscription {
    _: String
}
type MessageResponse {
    message: String!
    success: Boolean
}
type User {
    id: ID!
    isBlocked: Boolean!
    fullName: String!
    userName: String!
    email: String!
    password: String!
    confirmed: Boolean!
    status(status: Status): String
    resetPasswordToken: String
    emailConfirmToken: String
    twoFactorEnabled: Boolean!
    twoFactorSecret: String!
    twoFactorCode: String
    avatar: String
    location: String
    type(type: Role): String
    createdAt: String
    updatedAt: String
    kyc: Kyc
    shops: [Shop]
    brands: [Brand]
    favourites: Favorite
    pins: Pin
    subscriptions: UserSubscription
    roleBasedAccess: RoleBasedAccess
}
type Kyc {
    mobile: String
    gender: String
    birthDate: String
    nationality: String
    country: String
    postalCode: String
    city: String
    street: String
    building: String
    kycStatus(status: Status): String!
}
type AuthUser {
    user: User!
    token: String!
}
type Shop {
    id: ID!
    name: String
    email: String
    category: [Category]
    subCategory: [Category]
    logo: Media
    coverImage: Media
    tags: [Tag]
    website: String
    phoneNumber: String
    mobileNumber: String
    location: String
    address: String
    publishingDateTime: String
    facebook: String
    tiktok: String
    twitter: String
    instagram: String
    youtube: String
    linkedIn: String
    isBlocked: Boolean
    status(status: Status): String
    verified(verified: Verified): String
    viewCounts: Int
    clickCounts: Int
    subscriberCounts: Int
    owner: User
    brand: Brand
    admin: [User]
    modifier: [User]
    watcher: [User]
    subscribers: [User]
    roleBaseAccessInvites: ShopRoleBaseAccessInvite
    verifiedBy: User
    promotions: [Promotion]
}
type Promotion {
    id: ID!
    name: String
    media: [Media]
    tags: [Tag]
    category: [Category]
    subCategory: [Category]
    description: String
    price: String
    publishingDateTime: String
    verified(verified: Verified): String
    viewCounts: Int
    clickCounts: Int
    isUpcoming: Boolean
    status(status: Status): String
    publisher: User
    verifiedBy: User
    brand: Brand
    shops: [Shop]
    startDate: String
    endDate: String
}
type Media {
    id: ID!
    url: [String]
    mediaType(mediaType: MediaTypes): String
    uploadedBy: User
    createdAt: String
    updatedAt: String
}
type UserSubscription {
    id: ID!
    user: User
    shops: [Shop]
    brands: [Shop]
    createdAt: String
    updatedAt: String
}
type ShopRoleBaseAccessInvite {
    id: ID!
    user: User
    invite: User
    shop: Shop
    role(role: Role): String
    inviteLink: String
    isAccepted: Boolean
    isExpired: Boolean
    createdAt: String
    updatedAt: String
}
type RoleBasedAccess {
    id: ID!
    admin: AccessItem
    modifier: AccessItem
    watcher: AccessItem
    createdAt: String
    updatedAt: String
}
type AccessItem {
    shops: [Shop]
    brands: [Brand]
}
type Pin {
    id: ID!
    user: User
    shops: [Shop]
    brands: [Shop]
    promotions: [Promotion]
    createdAt: String
    updatedAt: String
}
type Favorite {
    id: ID!
    user: User
    shops: [Shop]
    brands: [Shop]
    createdAt: String
    updatedAt: String
}
type BrandRoleBaseAccessInvite {
    id: ID!
    user: User!
    email: String!
    invite: User
    brand: Brand!
    role(role: Role): String!
    inviteLink: String!
    isAccepted: Boolean
    isExpired: Boolean
    createdAt: String
    updatedAt: String
}
type Brand {
    id: ID!
    name: String
    email: String
    category: [Category]
    subCategory: [Category]
    logo: Media
    coverImage: Media
    tags: [Tag]
    website: String
    phoneNumber: String
    mobileNumber: String
    publishingDateTime: String
    facebook: String
    tiktok: String
    twitter: String
    instagram: String
    youtube: String
    linkedIn: String
    status(status: Status): String
    isBlocked: Boolean
    verified(verified: Verified): String
    viewCounts: Int
    clickCounts: Int
    subscriberCounts: Int
    owner: User
    brandShops: [Shop]
    admins: [User]
    modifiers: [User]
    watchers: [User]
    roleBaseAccessInvites: [BrandRoleBaseAccessInvite]
    subscribers: [User]
    verifiedBy: User
    promotions: [Promotion]
    createdAt: String
    updatedAt: String
}
type BrandClick {
    brand: Brand
    user: User
}
type BrandView {
    brand: Brand
    user: User
}
type Category {
    id: ID
    title: String
    level: Float
    subCategories: [Category]
    parentCategory: Category
    createdAt: String
    updatedAt: String
}
type Tag {
    id: ID
    title: String
    shops: [Shop]
    brands: [Brand]
    createdAt: String
    updatedAt: String
}
enum Status {
    PENDING
    NOT_SUBMITTED
    VERIFIED
    REJECTED
    ARCHIVED
    DELETED
    UPCOMING
    PUBLISHED
    DRAFT
}
enum Role {
    SUPER_ADMIN
    ADMIN
    MODIFIER
    WATCHER
    OWNER
    USER
}
enum Verified {
    REJECTED
    PENDING
    VERIFIED
}
enum Sort {
    NEWEST
    LOW_TO_HIGH
    HIGH_TO_LOW
    TOP_SOLD
}
enum MediaTypes {
    AVATAR
    IMAGE
    BOOKLET
    THUMBNAIL
    LOGO
    VIDEO
    VIDEO_THUMBNAIL
}
input UserRegisterInput {
    fullName: String!
    userName: String!
    email: String!
    password: String!
}
input UserInput {
    fullName: String
    avatar: String
    location: String
    type: Role
}
input ShopInput {
    name: String!
    brand: ID
    category: [ID!]!
    subCategory: [ID!]!
    logo: ID
    coverImage: String
    tags: [ID]
    website: String
    phoneNumber: String!
    mobileNumber: String
    location: String!
    address: String!
    facebook: String
    tiktok: String
    twitter: String
    instagram: String
    youtube: String
    linkedIn: String
    status: Status
    email: String
}
input PromotionInput {
    name: String!
    media: [ID]!
    tags: [ID]
    category: [ID]
    subCategory: [ID]
    description: String
    price: String
    startDate: String
    endDate: String
    isUpcoming: Boolean
    status: Status
    shops: [ID]
    brand: ID
}
input BrandInput {
    name: String
    email: String
    category: [ID]
    subCategory: [ID]
    logo: ID
    coverImage: ID
    tags: [ID]
    website: String
    phoneNumber: String
    mobileNumber: String
    facebook: String
    tiktok: String
    twitter: String
    instagram: String
    youtube: String
    linkedIn: String
    status: Status
}
directive @isAuth2(requires: [Role] = [USER]) on OBJECT | FIELD_DEFINITION
directive @isAuth(requires: Role = ADMIN) on OBJECT | FIELD_DEFINITION
"Exposes a URL that specifies the behavior of this scalar."
directive @specifiedBy(
    "The URL that specifies the behavior of this scalar."
    url: String!
) on SCALAR
```

---

## Examples

1) Login and get token
- Operation
```
mutation Login($userName: String!, $password: String!) {
  loginUser(userName: $userName, password: $password) {
    token
    user { id fullName userName email confirmed }
  }
}
```
- Variables
```
{ "userName": "demo", "password": "secret123" }
```

2) Fetch brands with pagination and published filter
- Operation
```
query Brands($options: Options) {
  publishedBrands(options: $options) {
    pagination { currentPage totalPages totalRecords limit offset }
    brands { id name status verified viewCounts owner { id userName } }
  }
}
```
- Variables
```
{ "options": { "paginationOptions": { "page": 1, "limit": 10 }, "where": "{}", "sort": "{}", "published": true } }
```

3) Create a Promotion
- Operation
```
mutation CreatePromotion($input: PromotionInput!) {
  createPromotion(newPromotion: $input) {
    id
    name
    status
    brand { id name }
    shops { id name }
  }
}
```
- Variables
```
{
  "input": {
    "name": "Summer Sale",
    "media": [],
    "tags": [],
    "category": [],
    "subCategory": [],
    "description": "50% off",
    "price": "0",
    "isUpcoming": false,
    "status": "DRAFT",
    "shops": [],
    "brand": null
  }
}
```
- Headers: Authorization: Bearer <JWT>

4) Upload a single file
- Operation
```
mutation ($file: Upload!, $mediaType: MediaTypes) {
  singleUpload(file: $file, mediaType: $mediaType) { id url mediaType uploadedBy { id } }
}
```
- Note: Use GraphQL multipart request per graphql-upload spec.

5) Notifications: list and mark as seen
- Operation
```
query ($options: Options) {
  listUserNotifications(options: $options) {
    pagination { totalRecords }
    userNotifications { id isSeen isDeleted notification { title entityType entityData { __typename } } }
  }
}
```
- Mutation to mark seen
```
mutation ($id: ID!) { viewNotification(id: $id) }
```

---

## REST ↔ GraphQL Notes
- REST is minimal (GET /, GET /sendnotification, GET /users/). All business features are exposed via GraphQL under POST /graphql.
- Overlap: Media uploads and notifications exist only in GraphQL.

---

## Type → Resolver Mapping (selected)
- User.shops, User.brands, User.favorites, User.pins, User.subscriptions, User.roleBasedAccess → schema/user/resolver.js
- Shop.brand, Shop.tags, Shop.category, Shop.subCategory, Shop.owner, Shop.admins, Shop.modifiers, Shop.watchers, Shop.subscribers, Shop.roleBaseAccessInvites, Shop.verifiedBy, Shop.logo, Shop.coverImage, Shop.promotions → schema/shop/resolver.js
- Brand.logo, Brand.coverImage, Brand.promotions, Brand.category, Brand.subCategory, Brand.tags, Brand.brandShops, Brand.admins, Brand.modifiers, Brand.watchers, Brand.subscribers, Brand.roleBaseAccessInvites, Brand.owner, Brand.verifiedBy → schema/brand/resolver.js
- Promotion.shops, Promotion.publisher, Promotion.verifiedBy, Promotion.brand, Promotion.category, Promotion.subCategory, Promotion.tags, Promotion.media → schema/promotion/resolver.js
- Category.parentCategory, Category.subCategories → schema/category/resolver.js
- Tag.shops, Tag.brands → schema/tag/resolver.js
- Notification.entityData, Notification.sender → schema/notification/resolver.js
- UserNotification.notification, UserNotification.user → schema/notification/resolver.js
- ShopRoleBaseAccessInvite.user/invited/shop → schema/shopRoleBaseAccessInvite/resolver.js
- BrandRoleBaseAccessInvite.user/invited/brand → schema/brandRoleBaseAccessInvite/resolver.js