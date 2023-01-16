const {gql} = require('apollo-server-express');


const promotionTypeDefs = gql`

    input PromotionInput {
        name: String!,
        media: [ID]!,
        tags:[ID],
        category: [ID],
        subCategory:[ID],
        description: String,
        price: String,
        startDate: String,
        endDate: String,
        isUpcoming: Boolean #shop at start promotion time
        status:Status
        shops:[ID],
        brand:ID,
    }

    type Promotion {
        id: ID!,
        name: String,
        media: [Media],
        tags:[Tag],
        category: [Category],
        subCategory:[Category],
        description: String,
        price: String,
        publishingDateTime:String,
        verified(verified:Verified):String,
        viewCounts:Int,
        clickCounts:Int,
        isUpcoming:Boolean,
        status(status:Status):String,
        publisher:User,
        verifiedBy:User,
        brand:Brand,
        shops:[Shop],
        startDate: String,
        endDate: String,
        user:String,
        createdAt:String,
        updatedAt:String,

    }
    
`;


module.exports = promotionTypeDefs;
