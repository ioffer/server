  const {gql} = require('apollo-server-express');

const brandQuery = gql`
    extend type Query {
        brands(offset: Int, limit: Int):[Brand],
        publishedBrands(offset: Int, limit: Int):[Brand],
        brandById(id:ID!):Brand @isAuth,
        searchPendingBrands:[Brand]  @isAuth2(requires: [SUPER_ADMIN]),
        searchBlockedBrands: [Brand] @isAuth2(requires: [SUPER_ADMIN])
#        searchShops(query:Query):[Shop]
    },
    
    extend type Mutation {
        createBrand(newBrand: BrandInput!):Brand @isAuth,
        editBrand(id:ID!, newBrand: BrandInput!): Brand  @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        deleteBrand(id: ID!):Boolean @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN]),
        archiveBrand(id: ID!):Boolean @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        unArchiveBrand(id: ID!):Boolean @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        verifyBrand(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        blockBrand(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        unblockBrand(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        inviteBrandModerator(id:ID!, email:String!, role:String!):Boolean @isAuth2(requires: [ADMIN,OWNER])
        removeBrandModerator(id:ID!,email:String!, role:String!):Boolean @isAuth2(requires: [ADMIN,OWNER])
        acceptBrandInvite(token:String!):Boolean @isAuth
        clickBrand(id:ID!):Boolean
        viewBrand(id:ID!):Boolean
        toggleSubscribeBrand(id:ID!):Boolean @isAuth
    }
    
`;


module.exports = brandQuery;
