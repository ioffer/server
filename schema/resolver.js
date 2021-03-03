const { mergeResolvers } = require('@graphql-tools/merge');
const userResolver = require('./user/resolver.js');
const smartContractResolver = require('./smartContract/resolver.js');
const imageResolver = require('./image/resolver.js');
const contractUploaderResolver = require('./contractUploader/resolver.js');
const orderResolver = require('./order/resolver.js');
const testOrderResolver = require('./testOrder/resolver.js');
const purchasedContractResolver = require('./purchasedContract/resolver.js');
const testPurchasedContractResolver = require('./testPurchasedContract/resolver.js');
const compiledContractResolver = require('./compiledContract/resolver.js')
const testCompiledContractResolver = require('./testCompiledContract/resolver.js')
const testLicenseResolver = require('./testLicense/resolver.js')
const deployedContractResolver = require('./deployedContract/resolver.js')
const testDeployedContractResolver = require('./testDeployedContract/resolver.js')
const customOrderResolver = require('./customOrder/resolver.js')
const dAppResolver = require('./dApp/resolver.js')
const dAppUploaderResolver = require('./dAppUploader/resolver.js')
const licenseResolver = require('./license/resolver.js')
const purchasedDAppResolver = require('./purchasedDApp/resolver.js')
const unBlockRequestResolver = require('./unBlockRequest/resolver.js')

const resolvers = [
    userResolver,
    smartContractResolver,
    imageResolver,
    contractUploaderResolver,
    orderResolver,
    testOrderResolver,
    purchasedContractResolver,
    compiledContractResolver,
    licenseResolver,
    deployedContractResolver,
    customOrderResolver,
    dAppResolver,
    dAppUploaderResolver,
    testPurchasedContractResolver,
    testCompiledContractResolver,
    testLicenseResolver,
    testDeployedContractResolver,
    purchasedDAppResolver,
    unBlockRequestResolver,
];

module.exports = mergeResolvers(resolvers);
