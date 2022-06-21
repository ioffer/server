const { mergeTypeDefs } = require('@graphql-tools/merge');

const userQuery = require('./user/query.js')
const userTypeDefs =require('./user/type')
const shopQuery = require('./shop/query.js')
const shopTypeDefs =require('./shop/type')
const promotionQuery = require('./promotion/query.js')
const promotionTypeDefs =require('./promotion/type')

const baseTypeDefs =require('./baseDefs.js')
const imageTypeDefs = require('./image/type.js')
const imageQuery = require('./image/query.js')
// const unBlockRequestTypeDefs = require('./unBlockRequest/type.js')
// const unBlockRequestQuery = require('./unBlockRequest/query.js')
const enumsTypeDefs = require('./constants/enums.js')

const userSubscriptionTypeDefs = require('./userSubscription/type.js')
const shopRoleBaseAccessInviteTypeDefs = require('./shopRoleBaseAccessInvite/type.js')
const roleBasedAccessTypeDefs = require('./roleBasedAccess/type.js')
const pinTypeDefs = require('./pin/type.js')
const mediaTypeDefs = require('./media/type.js')
const favoriteTypeDefs = require('./favorite/type.js')
const brandRoleBaseAccessInviteTypeDefs = require('./brandRoleBaseAccessInvite/type')
const brandTypeDefs = require('./brand/type')
const categoryTypeDefs = require('./category/type')
const categoryQuery = require('./category/query')
const tagQuery = require('./tag/query')
const tagTypeDefs = require('./tag/type')

const typeDefs = [
    baseTypeDefs,
    enumsTypeDefs,
    userTypeDefs,
    userQuery,
    shopQuery,
    shopTypeDefs,
    promotionQuery,
    promotionTypeDefs,
    imageTypeDefs,
    imageQuery,
    // unBlockRequestTypeDefs,
    // unBlockRequestQuery,
    userSubscriptionTypeDefs,
    shopRoleBaseAccessInviteTypeDefs,
    roleBasedAccessTypeDefs,
    pinTypeDefs,
    mediaTypeDefs,
    favoriteTypeDefs,
    brandRoleBaseAccessInviteTypeDefs,
    brandTypeDefs,
    categoryTypeDefs,
    categoryQuery,
    tagTypeDefs,
    tagQuery,

];

module.exports = mergeTypeDefs(typeDefs);
