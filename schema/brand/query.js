  const {gql} = require('apollo-server-express');

const brandQuery = gql`
    extend type Query {
        brands:[Brand],
        brandById(id:ID!):Brand @isAuth,
        searchPendingBrands:[Brand] @isAuth,
        searchBlockedBrands: [Brand] @isAuth
#        searchShops(query:Query):[Shop]
    },
    
    extend type Mutation {
        createBrand(newBrand: BrandInput!):Brand @isAuth,
        editBrand(id:ID!, newBrand: ShopInput!): Brand @isAuth,
        deleteBrand(id: ID!):Boolean @isAuth,
        verifyBrand(id:ID!):Boolean @isAuth,
        blockBrand(id:ID!):Boolean @isAuth,
        inviteBrandModerator(id:ID!, email:String!, role:String!):Boolean @isAuth
        removeBrandModerator(id:ID!,email:String!, role:String!):Boolean @isAuth
        clickBrand(id:ID!):Boolean
        viewBrand(id:ID!):Boolean
        subscribeBrand(id:ID!):Boolean @isAuth
        createBrandPromotion(id:ID!):Promotion
    }
    
`;



module.exports = brandQuery;
