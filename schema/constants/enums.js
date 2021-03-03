const {gql} = require('apollo-server-express');


const enumsTypeDefs = gql`

    enum Status {
        NOT_SUBMITTED
        PENDING
        VERIFIED
        REJECTED
    }

    enum Type {
        ADMIN
        USER
        DEVELOPER
    }
    
    enum Category {
        DOCUMENTS
        ESCROW
        FINANCIAL
        SOCIAL
        TOOLS
        UTILITY
    },
    enum Verified {
        REJECTED
        PENDING
        VERIFIED
    }

    enum Sort{
        NEWEST
        LOW_TO_HIGH
        HIGH_TO_LOW
        TOP_SOLD
    }

    enum ProductType {
        SMARTCONTRACT
        DAPP
    }

    enum LicenseType{
        SINGLELICENSE,
        UNLIMITEDLICENSE
    }
    
    type MessageResponse {
        message: String!
        success: Boolean
    },

    type Wallet{
        privateKey:String,
        publicKey:String,
    },
    
`;

module.exports = enumsTypeDefs;
