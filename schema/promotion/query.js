  const {gql} = require('apollo-server-express');

const userQuery = gql`
    extend type Query {
        promotions(options:Options):Promotions,
        publishedPromotions(options:Options):Promotions,
        promotionById(id:ID!):Promotion,
        searchPendingPromotions(options:Options):Promotions @isAuth2(requires: [SUPER_ADMIN]),
        searchArchivedPromotions(shopId:ID!,options:Options):Promotions @isAuth2(requires: [SUPER_ADMIN, OWNER]),
        searchUpcomingPromotions(shopId:ID!, options:Options):Promotions @isAuth2(requires: [SUPER_ADMIN]),
#        searchPromotions(query:Query):[Promotion]
    },
    
    extend type Mutation {
        createPromotion(newPromotion: PromotionInput!):Promotion @isAuth, #ADMIN, OWNER or MODIFIER of Brand or of all Shops
        editPromotion(id:ID!, newPromotion: PromotionInput!): Promotion @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        deletePromotion(id: ID!):Boolean @isAuth2(requires: [OWNER, SUPER_ADMIN, ADMIN]),
        verifyPromotion(id:ID!):Boolean @isAuth2(requires: [SUPER_ADMIN]),
        archivePromotion(id:ID!):Boolean @isAuth2(requires: [MODIFIER,ADMIN,OWNER]),
        unArchivePromotion(id:ID!):Boolean @isAuth2(requires: [MODIFIER,ADMIN,OWNER])
        clickPromotion(id:ID!):Boolean
        viewPromotion(id:ID!):Boolean
    }
    
`;



module.exports = userQuery;
