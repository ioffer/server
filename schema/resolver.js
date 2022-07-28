const { mergeResolvers } = require('@graphql-tools/merge');
const userResolver = require('./user/resolver.js');
const shopResolver = require('./shop/resolver.js');
const brandResolver = require('./brand/resolver.js');
const promotionResolver = require('./promotion/resolver.js');
const mediaResolver = require('./media/resolver.js');
const categoryResolver = require('./category/resolver.js');
const tagResolver = require('./tag/resolver.js');
// const unBlockRequestResolver = require('./unBlockRequest/resolver.js')

const resolvers = [
    userResolver,
    shopResolver,
    brandResolver,
    promotionResolver,
    mediaResolver,
    categoryResolver,
    tagResolver,
    // unBlockRequestResolver,
];

module.exports = mergeResolvers(resolvers);
