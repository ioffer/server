  const {gql} = require('apollo-server-express');

const userQuery = gql`
    extend type Query {
        promotions:[Promotion],
        promotionById(id:ID!):Promotion @isAuth,
        promotionByShop(shopID:ID!):Promotion @isAuth,
        searchPendingPromotions:[Promotion] @isAuth,
        showArchivedPromotions(shopId:ID!):[Promotion] @isAuth,
        showHiddenPromotions(shopId:ID!):[Promotion] @isAuth,
        searchPromotions(query:Query):[Promotion]
    },
    
    extend type Mutation {
        createPromotion(shopID:ID!, newPromotion: PromotionInput!):Promotion @isAuth,
        editPromotion(id:ID!, newPromotion: PromotionInput!): Promotion @isAuth,
        deletePromotion(id: ID!):Boolean @isAuth,
        verifyPromotion(id:ID!):Boolean @isAuth,
        hidePromotion(id:ID!):Boolean @isAuth
        archivePromotion(id:ID!):Boolean @isAuth
        clickPromotion(id:ID!):Boolean
        viewPromotion(id:ID!):Boolean
    }
    
`;



module.exports = userQuery;
