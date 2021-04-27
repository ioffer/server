const {gql} = require('apollo-server-express');


const promotionTypeDefs = gql`

    input PromotionInput {
        name: String,
        images: [String],
        tags:[String],
        category: [String],
        description: String,
        price: String,
        verifiedBy:User,
        startDate: String,
        endDate: String,
        hidden: Boolean
    }

    type Promotion {
        id: ID!,
        name: String,
        images: [String],
        tags:[String],
        category: [String],
        description: String,
        price: String,
        publishingDateTime:String,
        verified:Boolean,
        viewCounts:Int,
        clickCounts:Int,
        hidden:Boolean,
        archived:Boolean,
        publisher:User,
        verifiedBy:User,
        shop:Shop,
        startDate: String,
        endDate: String,
    }
    
`;


module.exports = promotionTypeDefs;
