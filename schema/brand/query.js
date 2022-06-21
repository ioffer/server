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
        createBrand(newShop: BrandInput!):Brand @isAuth,
        editBrand(id:ID!, newShop: ShopInput!): Brand @isAuth,
        deleteBrand(id: ID!):Boolean @isAuth,
        verifyBrand(id:ID!):Boolean @isAuth,
        blockBrand(id:ID!):Boolean @isAuth,
#        inviteModerators(id:ID!, emails:[String]):Boolean @isAuth
#        addModerator(id:ID!,userID:ID!):Boolean @isAuth
        clickBrand(id:ID!):Boolean
        viewBrand(id:ID!):Boolean
        subscribeBrand(id:ID!):Boolean
        createBrandPromotion(id:ID!):Brand
    }
    
`;



module.exports = userQuery;
