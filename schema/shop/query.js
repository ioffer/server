  const {gql} = require('apollo-server-express');
const userQuery = gql`
    extend type Query {
        allShops(options:Options):Shops @isAuth2(requires: [SUPER_ADMIN]), # for super admins
        shops(options:Options):Shops @isAuth, # for dashboard users
        publishedShops(options:Options):Shops, # for mobile app users
        shopById(id:ID!):Shop @isAuth, # for everyone
        moderatorsByShopId(id:ID!):[ShopRoleBaseAccessInvite] @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN, MODIFIER, WATCHER]),
        searchPendingShops(options:Options):Shops @isAuth2(requires: [SUPER_ADMIN]), # for super users
        searchBlockedShops(options:Options):Shops @isAuth2(requires: [SUPER_ADMIN]) # for super users
#        searchShops(query:Query):[Shop]
    },
    
    extend type Mutation {
        registerShop(newShop: ShopInput!):Shop @isAuth,
        editShop(id:ID!, newShop: ShopInput!): Shop @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        deleteShop(id: ID!):Boolean @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN]),
        verifyShop(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        blockShop(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        unblockShop(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        archiveShop(id:ID!):Boolean @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        unArchiveShop(id:ID!):Boolean @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        inviteShopModerator(id:ID!, email:String!, role:String!):Boolean @isAuth2(requires: [ADMIN,OWNER])
        removeShopModerator(id:ID!,email:String!, role:String!):Boolean @isAuth2(requires: [ADMIN,OWNER])
        acceptShopInvite(token:String!):Boolean @isAuth
        clickShop(id:ID!):Boolean
        viewShop(id:ID!):Boolean
        toggleSubscribeShop(id:ID!):Boolean @isAuth
    }
    
`;



module.exports = userQuery;
