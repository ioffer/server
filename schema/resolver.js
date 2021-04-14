const { mergeResolvers } = require('@graphql-tools/merge');
const userResolver = require('./user/resolver.js');
// const shopResolver = require('./shop/resolver.js');
const imageResolver = require('./image/resolver.js');
// const unBlockRequestResolver = require('./unBlockRequest/resolver.js')

const resolvers = [
    userResolver,
    imageResolver,
    // unBlockRequestResolver,
];

module.exports = mergeResolvers(resolvers);
