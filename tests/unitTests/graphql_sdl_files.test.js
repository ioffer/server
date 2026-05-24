// Test that individual SDL modules export a gql DocumentNode-like value (string template via apollo gql)
// We won't parse gql; just assert presence of expected substrings.

const userType = require('../../schema/user/type.js');
const userQuery = require('../../schema/user/query.js');
const shopType = require('../../schema/shop/type.js');
const shopQuery = require('../../schema/shop/query.js');
const brandType = require('../../schema/brand/type.js');
const brandQuery = require('../../schema/brand/query.js');
const promotionType = require('../../schema/promotion/type.js');
const promotionQuery = require('../../schema/promotion/query.js');
const enumsTypeDefs = require('../../schema/constants/enums.js');
const baseTypeDefs = require('../../schema/baseDefs.js');
const mediaType = require('../../schema/media/type.js');
const mediaQuery = require('../../schema/media/query.js');
const notificationType = require('../../schema/notification/type.js');
const notificationQuery = require('../../schema/notification/query.js');
const categoryQuery = require('../../schema/category/query.js');
const tagType = require('../../schema/tag/type.js');
const tagQuery = require('../../schema/tag/query.js');

function getSDLString(doc) {
  // Try to extract SDL string from gql DocumentNode
  if (doc && doc.loc && doc.loc.source && typeof doc.loc.source.body === 'string') {
    return doc.loc.source.body;
  }
  // Some modules might export a function or array; fallback to string conversion
  try {
    return String(doc);
  } catch (e) {
    return '';
  }
}

function expectStringIncludes(doc, substrings = []) {
  const s = getSDLString(doc);
  substrings.forEach((sub) => expect(s.includes(sub)).toBe(true));
}

describe('GraphQL SDL modules export expected SDL strings', () => {
  test('baseDefs contains directive declarations and root types', () => {
    expectStringIncludes(baseTypeDefs, ['directive @isAuth', 'type Query', 'type Mutation', 'type Subscription']);
  });

  test('enumsTypeDefs contains Status and Role enums', () => {
    expectStringIncludes(enumsTypeDefs, ['enum Status', 'enum Role', 'enum Verified']);
  });

  test('user SDL contains User and AuthUser types and queries', () => {
    expectStringIncludes(userType, ['type User', 'type AuthUser']);
    expectStringIncludes(userQuery, ['extend type Query', 'loginUser', 'registerUser']);
  });

  test('shop SDL contains Shop type and relevant mutations', () => {
    expectStringIncludes(shopType, ['type Shop', 'type Shops']);
    expectStringIncludes(shopQuery, ['registerShop', 'verifyShop']);
  });

  test('brand SDL contains Brand type and brand queries', () => {
    expectStringIncludes(brandType, ['type Brand', 'type Brands']);
    expectStringIncludes(brandQuery, ['createBrand', 'verifyBrand']);
  });

  test('promotion SDL contains Promotion type and queries', () => {
    expectStringIncludes(promotionType, ['type Promotion', 'type Promotions']);
    expectStringIncludes(promotionQuery, ['createPromotion', 'verifyPromotion']);
  });

  test('media and notification SDL present', () => {
    expectStringIncludes(mediaType, ['type Media']);
    expectStringIncludes(mediaQuery, ['singleUpload', 'multipleUpload']);
    expectStringIncludes(notificationType, ['type Notification', 'type UserNotification']);
    expectStringIncludes(notificationQuery, ['createNotification', 'listUserNotifications']);
  });

  test('category and tag SDL present', () => {
    expectStringIncludes(categoryQuery, ['categories', 'subCategories']);
    expectStringIncludes(tagType, ['type Tag']);
    expectStringIncludes(tagQuery, ['createTag', 'tags']);
  });
});
