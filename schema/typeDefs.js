const { mergeTypeDefs } = require('@graphql-tools/merge');

const userQuery = require('./user/query.js')
const userTypeDefs =require('./user/type')
const baseTypeDefs =require('./baseDefs.js')
const smartContractTypeDefs =require('./smartContract/type.js')
const smartContractQuery = require('./smartContract/query.js')
const imageTypeDefs = require('./image/type.js')
const imageQuery = require('./image/query.js')
const orderTypeDefs = require('./order/type.js')
const orderQuery = require('./order/query.js')
const testOrderTypeDefs = require('./testOrder/type.js')
const testOrderQuery = require('./testOrder/query.js')
const purchasedContractTypeDefs = require('./purchasedContract/type.js')
const purchasedContractQuery = require('./purchasedContract/query.js')
const testPurchasedContractTypeDefs = require('./testPurchasedContract/type.js')
const testPurchasedContractQuery = require('./testPurchasedContract/query.js')
const contractUploaderQuery = require('./contractUploader/query.js')
const compiledContractTypeDefs = require('./compiledContract/type.js')
const compiledContractQuery = require('./compiledContract/query.js')
const testCompiledContractTypeDefs = require('./testCompiledContract/type.js')
const testCompiledContractQuery = require('./testCompiledContract/query.js')
const licenseTypeDefs = require('./license/type.js')
const licenseQuery = require('./license/query.js')
const testLicenseTypeDefs = require('./testLicense/type.js')
const testLicenseQuery = require('./testLicense/query.js')
const deployedContractQuery = require('./deployedContract/query.js')
const deployedContractTypeDefs = require('./deployedContract/type.js')
const testDeployedContractQuery = require('./testDeployedContract/query.js')
const testDeployedContractTypeDefs = require('./testDeployedContract/type.js')
const customOrderQuery = require('./customOrder/query.js')
const customOrderTypeDefs = require('./customOrder/type.js')
const purchasedDAppTypeDefs = require('./purchasedDApp/type.js')
const purchasedDAppQuery = require('./purchasedDApp/query.js')
const dAppTypeDefs = require('./dApp/type.js')
const dAppQueryDefs = require('./dApp/query.js')
const dAppUploaderQuery = require('./dAppUploader/query.js')
const unBlockRequestTypeDefs = require('./unBlockRequest/type.js')
const unBlockRequestQuery = require('./unBlockRequest/query.js')
const enumsTypeDefs = require('./constants/enums.js')

const typeDefs = [
    baseTypeDefs,
    enumsTypeDefs,
    contractUploaderQuery,
    userTypeDefs,
    userQuery,
    smartContractTypeDefs,
    smartContractQuery,
    imageTypeDefs,
    imageQuery,
    orderTypeDefs,
    orderQuery,
    testOrderTypeDefs,
    testOrderQuery,
    purchasedContractTypeDefs,
    purchasedContractQuery,
    testPurchasedContractTypeDefs,
    testPurchasedContractQuery,
    compiledContractTypeDefs,
    compiledContractQuery,
    testCompiledContractTypeDefs,
    testCompiledContractQuery,
    licenseTypeDefs,
    licenseQuery,
    testLicenseTypeDefs,
    testLicenseQuery,
    deployedContractQuery,
    deployedContractTypeDefs,
    testDeployedContractQuery,
    testDeployedContractTypeDefs,
    customOrderTypeDefs,
    customOrderQuery,
    dAppTypeDefs,
    dAppQueryDefs,
    purchasedDAppTypeDefs,
    purchasedDAppQuery,
    unBlockRequestTypeDefs,
    unBlockRequestQuery,
    dAppUploaderQuery,

];

module.exports = mergeTypeDefs(typeDefs);
