const { mergeTypeDefs } = require('@graphql-tools/merge');

const userQuery = require('./user/query.js')
const userTypeDefs =require('./user/type')
const baseTypeDefs =require('./baseDefs.js')
const imageTypeDefs = require('./image/type.js')
const imageQuery = require('./image/query.js')
// const unBlockRequestTypeDefs = require('./unBlockRequest/type.js')
// const unBlockRequestQuery = require('./unBlockRequest/query.js')
const enumsTypeDefs = require('./constants/enums.js')

const typeDefs = [
    baseTypeDefs,
    enumsTypeDefs,
    userTypeDefs,
    userQuery,
    imageTypeDefs,
    imageQuery,
    // unBlockRequestTypeDefs,
    // unBlockRequestQuery,
];

module.exports = mergeTypeDefs(typeDefs);
