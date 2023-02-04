  const {gql} = require('apollo-server-express');

const brandQuery = gql`
    extend type Query {
        allBrands(options:Options):Brands @isAuth2(requires: [SUPER_ADMIN]) # for super admin
        brands(options:Options):Brands @isAuth, # for dashboard users
        publishedBrands(options:Options):Brands, # for mobile app users
        brandById(id:ID!):Brand @isAuth, # for everyone
        moderatorsByBrandId(id:ID!):[BrandRoleBaseAccessInvite] @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN, MODIFIER, WATCHER]),
        searchPendingBrands(options:Options):Brands  @isAuth2(requires: [SUPER_ADMIN]), # for super admins
        searchBlockedBrands(options:Options): Brands @isAuth2(requires: [SUPER_ADMIN]) # for super admins
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
