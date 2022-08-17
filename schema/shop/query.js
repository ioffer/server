  const {gql} = require('apollo-server-express');

const userQuery = gql`
    extend type Query {
        shops:[Shop],
        shopById(id:ID!):Shop @isAuth,
        searchPendingShops:[Shop] @isAuth,
        searchBlockedShops: [Shop] @isAuth
#        searchShops(query:Query):[Shop]
    },
    
    extend type Mutation {
        registerShop(newShop: ShopInput!):Shop @isAuth,
        editShop(id:ID!, newShop: ShopInput!): Shop @isAuth,
        deleteShop(id: ID!):Boolean @isAuth,
        verifyShop(id:ID!):Boolean @isAuth,
        blockShop(id:ID!):Boolean @isAuth,
        archiveShop(id:ID!):Boolean @isAuth,
        unArchiveShop(id:ID!):Boolean @isAuth,
        inviteShopModerator(id:ID!, email:String!, role:String!):Boolean @isAuth
        removeShopModerator(id:ID!,email:String!, role:String!):Boolean @isAuth
        clickShop(id:ID!):Boolean
        viewShop(id:ID!):Boolean
        subscribeShop(id:ID!):Boolean @isAuth
    }
    
`;



module.exports = userQuery;
