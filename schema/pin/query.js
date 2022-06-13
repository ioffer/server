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
        inviteModerators(id:ID!, emails:[String]):Boolean @isAuth
        addModerator(id:ID!,userID:ID!):Boolean @isAuth
        clickShop(id:ID!):Boolean
        viewShop(id:ID!):Boolean
    }
    
`;



module.exports = userQuery;
