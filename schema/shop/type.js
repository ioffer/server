const {gql} = require('apollo-server-express');


const shopTypeDefs = gql`

    input ShopInput {
        name: String,
        shopCategory:[String],
        logo: String,
        tags:[String],
        website: String,
        phoneNumbers: String,
        mobileNumber: String,
        location: String,
        address: String,
        moderators:[ID]
    }

    type Shop {
        id: ID!,
        name: String,
        shopCategory:[String],
        logo: String,
        tags:[String],
        website: String,
        phoneNumbers: String,
        mobileNumber: String,
        location: String,
        address: String,
        moderators:[User],
        publishingDateTime:String,
        isBlocked: Boolean,
        verified(verified: Verified): String,
        viewCounts: Int,
        clickCounts: Int,
        owner: User,
        verifiedBy: User,
        promotions: [Promotion],
        offers: [Offer]
    }
    
`;


module.exports = shopTypeDefs;
