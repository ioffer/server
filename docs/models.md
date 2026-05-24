# Database Models Documentation

This document lists all database models defined under models/ and describes their fields, types, constraints, defaults, relationships, schema options, virtuals, hooks, statics/methods, and query helpers.

Contents
- User
- Favorite
- Pin
- RoleBaseAccess
- Subscription
- Promotion
- Offer
- Shop
- Brand
- BrandClick
- BrandRoleBaseAccessInvite
- BrandView
- ShopClick
- ShopRoleBaseAccessInvite
- ShopView
- Category
- Link
- Media
- Tag
- UnBlockRequest
- Notification
- UserNotification

Note: Collection names used by Mongoose are indicated for each model.

## User (collection: `users`)
Fields
- fullName: string
- userName: string, unique: true
- email: string
- password: string
- confirmed: boolean, default: false
- resetPasswordToken: string
- isBlocked: boolean, default: false
- emailConfirmToken: string
- avatar: string, default: "http://localhost:4000/user.png"
- location: string
- twoFactorEnabled: boolean, default: false
- twoFactorSecret: string, default: ""
- twoFactorCode: string, default: ""
- notificationToken: string, default: null
- haveNotificationToken: boolean, default: false
- type: string, enum: Roles {SUPER_ADMIN, ADMIN, MODIFIER, WATCHER, OWNER, USER}, default: USER
- kyc: object
  - mobile: string, default: ""
  - gender: string, default: ""
  - birthDate: string, default: ""
  - nationality: string, default: ""
  - country: string, default: ""
  - postalCode: string, default: ""
  - city: string, default: ""
  - street: string, default: ""
  - building: string, default: ""
  - kycStatus: string, enum: Status {PENDING, NOT_SUBMITTED, VERIFIED, REJECTED, ARCHIVED, DELETED, UPCOMING, PUBLISHED, DRAFT, ACCEPTED, EXPIRED}, default: NOT_SUBMITTED
- shops: array<ObjectId>, ref: shops
- brands: array<ObjectId>, ref: brands
- favorites: ObjectId, ref: favorites
- pins: ObjectId, ref: pins
- subscriptions: ObjectId, ref: subscriptions
- roleBasedAccess: ObjectId, ref: role_base_accesses

Schema options
- timestamps: true

Relationships
- One-to-many/many-to-many with Shop and Brand via role and ownership stored in Shop/Brand models.
- One-to-one links to Favorites, Pins, Subscriptions, RoleBaseAccess aggregator documents.

Virtuals/Hooks/Methods/Query helpers
- None defined on schema.

## Favorite (collection: `favorites`)
Fields
- user: ObjectId, ref: users
- shops: array<ObjectId>, ref: shops
- brands: array<ObjectId>, ref: brands

Schema options
- timestamps: true

Relationships
- A user can favorite many shops and brands.

Virtuals/Hooks/Methods/Query helpers
- None.

## Pin (collection: `user_pins`)
Fields
- user: ObjectId, ref: users
- shops: array<ObjectId>, ref: shops
- brands: array<ObjectId>, ref: brands
- promotions: array<ObjectId>, ref: promotions
- offers: array<ObjectId>, ref: offers

Schema options
- timestamps: true

Relationships
- A user can pin many shops, brands, promotions, and offers.

Virtuals/Hooks/Methods/Query helpers
- None.

## RoleBaseAccess (collection: `role_base_accesses`)
Fields
- user: ObjectId, ref: users
- admin: object
  - shops: array<ObjectId>, ref: shops
  - brands: array<ObjectId>, ref: brands
- modifier: object
  - shops: array<ObjectId>, ref: shops
  - brands: array<ObjectId>, ref: brands
- watcher: object
  - shops: array<ObjectId>, ref: shops
  - brands: array<ObjectId>, ref: brands

Schema options
- timestamps: true

Relationships
- Grants role-based access of a user over shops and brands.

Virtuals/Hooks/Methods/Query helpers
- None.

## Subscription (collection: `subscriptions`)
Fields
- user: ObjectId, ref: users
- shops: array<ObjectId>, ref: shops
- brands: array<ObjectId>, ref: brands

Schema options
- timestamps: true

Relationships
- Tracks a user's subscriptions to shops and brands.

Virtuals/Hooks/Methods/Query helpers
- None.

## Promotion (collection: `promotions`)
Fields
- name: string
- media: array<ObjectId>, ref: medias
- tags: array<string>
- category: array<ObjectId>, ref: categories
- subCategory: array<ObjectId>, ref: categories
- description: string
- price: string
- publishingDateTime: string
- verified: string, default: PENDING
- viewCounts: number, default: 0
- clickCounts: number, default: 0
- isUpcoming: boolean, default: false
- status: string, enum: Status, default: DRAFT, with get/set transforms
- publisher: ObjectId, ref: users
- verifiedBy: ObjectId, ref: users
- shops: array<ObjectId>, ref: shops
- brand: ObjectId, ref: brands
- startDate: string
- endDate: string

Schema options
- timestamps: true
- toObject: { virtuals: true }
- toJSON: { virtuals: true }

Relationships
- Many-to-one with Brand (optional).
- Many-to-many with Shops via shops[].
- Published by a User; optionally verified by a User.

Virtuals/Hooks/Methods/Query helpers
- Methods:
  - getRelation(userId): derives user's role in context of brand/shops (OWNER/ADMIN/MODIFIER/WATCHER/null).
  - getBrandRelation(userId)
  - getShopsRelation(userId)
- Query helpers:
  - notDeleted(): status != DELETED
  - paginate(options): generic pagination with where/limit/offset/sort
  - published(): status == PUBLISHED
- Getters/Setters on status:
  - getStatus/setStatus: compute EXPIRED/UPCOMING/PUBLISHED based on isUpcoming, startDate, endDate and current time.

## Offer (collection: `offers`)
Fields
- name: string
- media: ObjectId, ref: medias
- tags: array<string>
- Category: array<ObjectId>, ref: categories
- subCategories: array<ObjectId>, ref: categories
- description: string
- price: string
- publishingDateTime: string
- verified: string, enum: Verified, default: PENDING
- viewCounts: number, default: 0
- clickCounts: number, default: 0
- isUpcoming: boolean, default: false
- status: string, enum: Status, default: DRAFT
- publisher: ObjectId, ref: users
- verifiedBy: ObjectId, ref: users
- shop: ObjectId, ref: shops
- brand: ObjectId, ref: brands
- startDate: string
- endDate: string

Schema options
- timestamps: true

Relationships
- Many-to-one with Shop and/or Brand.
- Published by a User; optionally verified by a User.

Virtuals/Hooks/Methods/Query helpers
- None.

## Shop (collection: `shops`)
Fields
- name: string
- category: array<ObjectId>, ref: categories
- subCategory: array<ObjectId>, ref: categories
- logo: ObjectId, ref: medias
- coverImage: ObjectId, ref: medias
- tags: array<ObjectId>, ref: tags
- website: string
- slug: string, default: "", with get/set functions
- email: string
- phoneNumber: string
- mobileNumber: string
- location: string
- address: string
- city: string
- publishingDateTime: string
- facebook: string
- tiktok: string
- twitter: string
- instagram: string
- youtube: string
- linkedIn: string
- isBlocked: boolean, default: false
- status: string, enum: Status, default: DRAFT
- verified: string, enum: Verified, default: PENDING
- viewCounts: number, default: 0
- clickCounts: number, default: 0
- subscriberCounts: number, default: 0
- owner: ObjectId, ref: users
- brand: ObjectId, ref: brands
- admins: array<ObjectId>, ref: users
- modifiers: array<ObjectId>, ref: users
- watchers: array<ObjectId>, ref: users
- subscribers: array<ObjectId>, ref: users
- roleBaseAccessInvites: array<ObjectId>, ref: shop_role_base_access_invites
- verifiedBy: ObjectId, ref: users
- promotions: array<ObjectId>, ref: promotions
- offers: array<ObjectId>, ref: offers

Schema options
- timestamps: true
- toObject: { virtuals: true }
- toJSON: { virtuals: true }

Relationships
- Many Shops belong to one Brand (optional brand field).
- Shop owned by one User; has role-based User arrays (admins, modifiers, watchers, subscribers).
- Linked to Promotions and Offers.
- Categorized by Categories and Tags; media via logo/coverImage.

Virtuals/Hooks/Methods/Query helpers
- Methods:
  - getRelation(userId): returns role of a user in this shop.
- Query helpers:
  - byName(name)
  - search(filter)
  - paginate(options)
  - byEmail(email)
  - published()
  - pending()
  - blocked()
  - notDeleted()

## Brand (collection: `brands`)
Fields
- name: string
- email: string
- category: array<ObjectId>, ref: categories
- subCategory: array<ObjectId>, ref: categories
- logo: ObjectId, ref: medias
- coverImage: ObjectId, ref: medias
- tags: array<string>
- website: string
- phoneNumber: string
- mobileNumber: string
- publishingDateTime: string
- facebook: string
- slug: string, default: "", with get/set functions
- tiktok: string
- twitter: string
- instagram: string
- youtube: string
- linkedIn: string
- status: string, enum: Status, default: DRAFT
- isBlocked: boolean, default: false
- verified: string, enum: Verified, default: PENDING
- viewCounts: number, default: 0
- clickCounts: number, default: 0
- subscriberCounts: number, default: 0
- owner: ObjectId, ref: users
- brandShops: array<ObjectId>, ref: shops
- admins: array<ObjectId>, ref: users
- modifiers: array<ObjectId>, ref: users
- watchers: array<ObjectId>, ref: users
- subscribers: array<ObjectId>, ref: users
- roleBaseAccessInvites: array<ObjectId>, ref: brand_role_base_access_invites
- verifiedBy: ObjectId, ref: users
- promotions: array<ObjectId>, ref: promotions
- offers: array<ObjectId>, ref: offers

Schema options
- timestamps: true
- toObject: { virtuals: true }
- toJSON: { virtuals: true }

Relationships
- Brand has many Shops (brandShops[] and reciprocal shop.brand).
- Brand owned by one User; role-based user arrays similar to Shop.
- Linked to Promotions and Offers.
- Categorized by Categories; media via logo/coverImage; tags are raw strings here.

Virtuals/Hooks/Methods/Query helpers
- Methods:
  - getRelation(userId)
- Query helpers:
  - byName(name)
  - search(filter)
  - paginate(options)
  - byEmail(email)
  - published()
  - pending()
  - blocked()

## BrandClick (collection: `brand_clicks`)
Fields
- brand: ObjectId, ref: brands
- user: ObjectId, ref: users

Schema options
- timestamps: true

Relationships
- Tracks which user clicked a brand.

Virtuals/Hooks/Methods/Query helpers
- None.

## BrandRoleBaseAccessInvite (collection: `brand_role_base_access_invites`)
Fields
- user: ObjectId, ref: users (inviter)
- invited: ObjectId, ref: users (invitee)
- invitedEmail: string
- brand: ObjectId, ref: brands
- role: string, enum: Roles
- status: string, enum: Status, default: PENDING, with get/set transforms depending on isExpired
- inviteLink: string, default: null
- isAccepted: boolean, default: false
- isDeleted: boolean, default: false
- expiresAt: string

Schema options
- timestamps: true
- toObject: { virtuals: true, getters: true }
- toJSON: { virtuals: true, getters: true }

Virtuals/Hooks/Methods/Query helpers
- Virtuals:
  - isExpired: boolean derived from expiresAt < Date.now()

Relationships
- Invitation to grant a role on a Brand to a user.

## BrandView (collection: `brandviews`)
Fields
- brand: ObjectId, ref: brands
- user: ObjectId, ref: users

Schema options
- timestamps: true

Relationships
- Tracks which user viewed a brand.

Virtuals/Hooks/Methods/Query helpers
- None.

## ShopClick (collection: `shop_clicks`)
Fields
- shop: ObjectId, ref: shops
- user: ObjectId, ref: users

Schema options
- timestamps: true

Relationships
- Tracks which user clicked a shop.

Virtuals/Hooks/Methods/Query helpers
- None.

## ShopRoleBaseAccessInvite (collection: `shop_role_base_access_invites`)
Fields
- user: ObjectId, ref: users (inviter)
- invited: ObjectId, ref: users (invitee)
- invitedEmail: string
- shop: ObjectId, ref: shops
- role: string, enum: Roles
- status: string, enum: Status, default: PENDING, with get/set transforms depending on isExpired
- inviteLink: string, default: null
- isAccepted: boolean, default: false
- isDeleted: boolean, default: false
- expiresAt: string

Schema options
- timestamps: true
- toObject: { virtuals: true, getters: true }
- toJSON: { virtuals: true, getters: true }

Virtuals/Hooks/Methods/Query helpers
- Virtuals:
  - isExpired: boolean derived from expiresAt < Date.now()

Relationships
- Invitation to grant a role on a Shop to a user.

## ShopView (collection: `shop_views`)
Fields
- shop: ObjectId, ref: shops
- user: ObjectId, ref: users

Schema options
- timestamps: true

Relationships
- Tracks which user viewed a shop.

Virtuals/Hooks/Methods/Query helpers
- None.

## Category (collection: `categories`)
Fields
- title: string, unique: true
- subCategories: array<ObjectId>, ref: categories
- level: number
- parentCategory: ObjectId, ref: categories
- shops: array<ObjectId>, ref: shops
- brands: array<ObjectId>, ref: brands
- promotions: array<ObjectId>, ref: promotions

Schema options
- timestamps: true

Relationships
- Self-referencing hierarchy via parentCategory and subCategories.
- Links categories to shops, brands, and promotions.

Virtuals/Hooks/Methods/Query helpers
- None.

## Link (collection: `links`)
Fields
- url: array<string>
- title: string, enum: SocialLinkTitles {FACEBOOK, TWITTER, YOUTUBE, INSTAGRAM, TIKTOK, WEBSITE}, default: ""
- linkType: string, enum: LinkTypes {SOCIAL}, default: SOCIAL

Schema options
- timestamps: true

Relationships
- Independent; URLs that can be attached/used by the app.

Virtuals/Hooks/Methods/Query helpers
- None.

## Media (collection: `medias`)
Fields
- url: array<string>
- mediaType: string, enum: MediaTypes {AVATAR, IMAGE, BOOKLET, THUMBNAIL, LOGO, VIDEO, VIDEO_THUMBNAIL}
- uploadedBy: ObjectId, ref: users

Schema options
- timestamps: true

Relationships
- Media can be referenced by Brand and Shop (logo, coverImage) and Offer/Promotion (media).

Virtuals/Hooks/Methods/Query helpers
- None.

## Tag (collection: `tags`)
Fields
- title: string, unique: true
- shops: array<ObjectId>, ref: shops
- brands: array<ObjectId>, ref: brands
- promotions: array<ObjectId>, ref: promotions

Schema options
- timestamps: true

Relationships
- Tags can be associated with shops, brands, and promotions. Shops hold refs to tags; brands store tag strings instead of tag refs.

Virtuals/Hooks/Methods/Query helpers
- None.

## UnBlockRequest (collection: `unblock_requests`)
Fields
- user: ObjectId, ref: users
- description: string, default: ''
- unBlocked: boolean, default: false

Schema options
- timestamps: true

Relationships
- Associates a user's request to be unblocked.

Virtuals/Hooks/Methods/Query helpers
- None.

## Notification (collection: `notifications`)
Fields
- title: string
- description: string
- messageTitle: string
- messageBody: string
- sender: ObjectId, ref: users, required: true
- entityType: string, enum: Models {User, Promotion, Brand, Shop, BrandRoleBaseAccessInvite, ShopRoleBaseAccessInvite, UserNotification}, required: true
- entity: ObjectId, dynamic ref via refPath: entityType, required: true
- link: string

Schema options
- timestamps: true
- toObject: { virtuals: true }
- toJSON: { virtuals: true }

Relationships
- Polymorphic (dynamic) relation to many entity types via entityType/refPath.

Virtuals/Hooks/Methods/Query helpers
- None.

## UserNotification (collection: `user_notifications`)
Fields
- notification: ObjectId, ref: notifications, required: true, index: true
- user: ObjectId, ref: users, required: true, index: true
- isSeen: boolean, default: false
- isDeleted: boolean, default: false

Schema options
- timestamps: true
- toObject: { virtuals: true }
- toJSON: { virtuals: true }

Relationships
- Associates a Notification to a User with read/delete flags.

Virtuals/Hooks/Methods/Query helpers
- Query helpers:
  - notDeleted(): isDeleted == false
  - search(filter)
  - paginate(options)

# Relations Overview
- User
  - Owns: Shop (shop.owner), Brand (brand.owner)
  - Has roles in: Shop.admins/modifiers/watchers/subscribers; Brand.admins/modifiers/watchers/subscribers
  - Publishes/Verifies: Promotion (publisher, verifiedBy), Offer (publisher, verifiedBy)
  - Aggregates: Favorite, Pin, Subscription, RoleBaseAccess
  - Uploaded media: Media.uploadedBy
  - Receives notifications: UserNotification.user; Sends notifications: Notification.sender
- Brand
  - Has many Shops: Shop.brand; Brand.brandShops[]
  - Promotions/Offers: Brand.promotions[], Brand.offers[]; also linked from Promotion.brand and Offer.brand
  - Categories: Brand.category[], Brand.subCategory[]
  - Media: Brand.logo, Brand.coverImage
  - Users with roles: owner/admins/modifiers/watchers/subscribers; Invites: BrandRoleBaseAccessInvite
  - Activity tracking: BrandView, BrandClick
- Shop
  - Belongs to Brand: Shop.brand
  - Promotions/Offers: Shop.promotions[], Shop.offers[]; also linked from Promotion.shops[] and Offer.shop
  - Categories/Tags: Shop.category[], Shop.subCategory[], Shop.tags[]
  - Media: Shop.logo, Shop.coverImage
  - Users with roles: owner/admins/modifiers/watchers/subscribers; Invites: ShopRoleBaseAccessInvite
  - Activity tracking: ShopView, ShopClick
- Promotion
  - Links to Brand (optional) and multiple Shops
  - Tagged by strings; Categorized by Categories
- Offer
  - Links to one Shop and/or one Brand
  - Tagged by strings; Categorized by Categories
- Category
  - Hierarchical self-relation (parentCategory/subCategories)
  - Connects to Shops, Brands, Promotions
- Tag
  - Connects to Shops, Brands, Promotions (Brand stores tag strings, not tag refs)
- Notification/UserNotification
  - Notification polymorphically references various entities via entityType/refPath
  - UserNotification ties a notification to a specific user with read/delete flags
- Media
  - Uploaded by a User and referenced by Brand/Shop/Promotion/Offer

Notes
- All ObjectId fields refer to documents in the indicated collections.
- Unless stated as required, fields are optional by default in these schemas.
- Many models enable timestamps, creating createdAt and updatedAt fields automatically.