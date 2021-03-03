const {gql} = require('apollo-server-express');


const smartContractTypeDefs = gql`
    
    input SmartContractInput{
        contractName: String!,
        contractCategory:[Category!]!,
        image: String!,
        tags:[String!]
        shortDescription: String!,
        description: String!,
        singleLicensePrice: String!,
        unlimitedLicensePrice: String!,
        source: String!,
        sourceContractName: String!,
        compilerVersion:String!,
    },
    
    
    input SmartContractVerify{
        verified:Verified!,
    }
    input SearchSmartContract{
        contractName:String,
        contractCategory:[Category],
        maxPrice:String,
        minPrice:String,
        tags:[String],
        sortBy:Sort,
    }
    
    
    type SmartContract {
        id: ID!,
        contractName: String,
        contractCategory(category:Category):[String],
        compilerVersion:String!,
        image: String,
        shortDescription: String,
        description: String,
        tags:[String],
        singleLicensePrice: String,
        unlimitedLicensePrice: String,
        source: String,
        sourceContractName: String,
        publisher:User!,#ID
        publishingDateTime:String,
        verified(verified:Verified): String!,
        verifiedBy: User,#ID
        preCompiled:CompiledContract,
        verifiedDateTime:String,
        purchasedCounts: String,
        compiledCounts: String,
        testedCounts: String,
        deployedCounts: String,
        createdAt: String!
        updatedAt: String!
    },
    
    
    type SmartContractMessageResponse {
        message: String!
        success: Boolean
    },

    
`;



module.exports = smartContractTypeDefs;
