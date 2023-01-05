  const {gql} = require('apollo-server-express');

const userQuery = gql`
    extend type Query {
        promotions:[Promotion],
        promotionById(id:ID!):Promotion @isAuth,
        searchPendingPromotions:[Promotion] @isAuth,
        searchArchivedPromotions(shopId:ID!):[Promotion] @isAuth,
        searchUpcomingPromotions(shopId:ID!):[Promotion] @isAuth,
#        searchPromotions(query:Query):[Promotion]
    },
    
    extend type Mutation {
        createPromotion(newPromotion: PromotionInput!):Promotion @isAuth, #ADMIN, OWNER or MODIFIER of Brand or of all Shops
        editPromotion(id:ID!, newPromotion: PromotionInput!): Promotion @isAuth,
        deletePromotion(id: ID!):Boolean @isAuth,
        verifyPromotion(id:ID!):Boolean @isAuth,
        archivePromotion(id:ID!):Boolean @isAuth
        clickPromotion(id:ID!):Boolean
        viewPromotion(id:ID!):Boolean
    }
    
`;



module.exports = userQuery;
