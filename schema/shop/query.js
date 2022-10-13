  const {gql} = require('apollo-server-express');
const userQuery = gql`
    extend type Query {
        allShops:[Shop] @isAuth2(requires: [SUPER_ADMIN]),
        publishedShops:[Shop] @isAuth2(requires: [USER]),
        shops:[Shop] @isAuth2(requires: [USER]),
        shopById(id:ID!):Shop @isAuth2(requires: [MODIFIER,WATCHER]),
        searchPendingShops:[Shop] @isAuth2(requires: [SUPER_ADMIN]),
        searchBlockedShops: [Shop] @isAuth2(requires: [SUPER_ADMIN])
#        searchShops(query:Query):[Shop]
    },
    
    extend type Mutation {
        registerShop(newShop: ShopInput!):Shop @isAuth,
        editShop(id:ID!, newShop: ShopInput!): Shop @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        deleteShop(id: ID!):Boolean @isAuth2(requires: [ADMIN,OWNER]),
        verifyShop(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        blockShop(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        archiveShop(id:ID!):Boolean @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        unArchiveShop(id:ID!):Boolean @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        inviteShopModerator(id:ID!, email:String!, role:String!):Boolean @isAuth2(requires: [ADMIN,OWNER])
        removeShopModerator(id:ID!,email:String!, role:String!):Boolean @isAuth2(requires: [ADMIN,OWNER])
        clickShop(id:ID!):Boolean
        viewShop(id:ID!):Boolean
        subscribeShop(id:ID!):Boolean @isAuth
    }
    
`;



module.exports = userQuery;
